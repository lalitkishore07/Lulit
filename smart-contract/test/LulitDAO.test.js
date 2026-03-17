const { expect } = require("chai");
const { ethers } = require("hardhat");
const { mine, time } = require("@nomicfoundation/hardhat-network-helpers");

describe("LulitDAO", function () {
  async function deployFixture() {
    const [owner, alice, bob, whale] = await ethers.getSigners();

    const Token = await ethers.getContractFactory("LulitGovernanceToken");
    const token = await Token.deploy(owner.address);
    await token.waitForDeployment();

    const Treasury = await ethers.getContractFactory("LulitDAOTreasury");
    const treasury = await Treasury.deploy(owner.address);
    await treasury.waitForDeployment();

    const DAO = await ethers.getContractFactory("LulitDAO");
    const dao = await DAO.deploy(await token.getAddress(), await treasury.getAddress(), owner.address);
    await dao.waitForDeployment();

    await (await treasury.transferOwnership(await dao.getAddress())).wait();

    await (await dao.setConfig(
      60,          // voting delay
      3600,        // voting duration
      300,         // execution timelock
      2_000,       // quorum 20%
      100,         // threshold 1%
      10_000,      // anti-whale off for baseline lifecycle tests
      600          // minimum stake lock
    )).wait();

    return { owner, alice, bob, whale, token, treasury, dao };
  }

  it("runs full proposal lifecycle and releases treasury funds", async function () {
    const { owner, alice, bob, token, treasury, dao } = await deployFixture();
    await owner.sendTransaction({ to: await treasury.getAddress(), value: ethers.parseEther("1") });

    await (await token.mint(alice.address, ethers.parseEther("500"))).wait();
    await (await token.mint(bob.address, ethers.parseEther("200"))).wait();

    await (await token.connect(alice).delegate(alice.address)).wait();
    await (await token.connect(bob).delegate(bob.address)).wait();
    await mine(2);

    const iface = new ethers.Interface([
      "function release(address to, uint256 amount)"
    ]);
    const callData = iface.encodeFunctionData("release", [alice.address, ethers.parseEther("0.2")]);
    const metadataHash = ethers.keccak256(ethers.toUtf8Bytes("treasury proposal 1"));

    await (await dao.connect(alice).createProposal(
      2,
      metadataHash,
      await treasury.getAddress(),
      0,
      callData
    )).wait();

    const proposalId = await dao.proposalCount();
    expect(await dao.getProposalState(proposalId)).to.equal(0); // pending

    await time.increase(70);
    await (await dao.connect(alice).castVote(proposalId, 1)).wait(); // for
    await (await dao.connect(bob).castVote(proposalId, 0)).wait();   // against

    await time.increase(3700);
    await (await dao.finalizeProposal(proposalId)).wait();
    expect(await dao.getProposalState(proposalId)).to.equal(2); // passed

    const before = await ethers.provider.getBalance(alice.address);
    const treasuryBefore = await ethers.provider.getBalance(await treasury.getAddress());
    await time.increase(320);
    await (await dao.executeProposal(proposalId)).wait();
    const after = await ethers.provider.getBalance(alice.address);
    const treasuryAfter = await ethers.provider.getBalance(await treasury.getAddress());

    expect(after - before).to.equal(ethers.parseEther("0.2"));
    expect(treasuryBefore - treasuryAfter).to.equal(ethers.parseEther("0.2"));

    expect(await dao.getProposalState(proposalId)).to.equal(4); // executed
  });

  it("prevents double voting and enforces anti-whale vote cap", async function () {
    const { owner, whale, alice, token, dao } = await deployFixture();
    await (await dao.setConfig(60, 3600, 300, 1_000, 100, 1_000, 600)).wait(); // cap 10%

    await (await token.mint(whale.address, ethers.parseEther("10000"))).wait();
    await (await token.mint(alice.address, ethers.parseEther("1000"))).wait();

    await (await token.connect(whale).delegate(whale.address)).wait();
    await (await token.connect(alice).delegate(alice.address)).wait();
    await mine(2);

    const metadataHash = ethers.keccak256(ethers.toUtf8Bytes("anti whale"));
    await (await dao.connect(whale).createProposal(
      0,
      metadataHash,
      await dao.getAddress(),
      0,
      "0x"
    )).wait();
    const proposalId = await dao.proposalCount();

    await time.increase(70);
    await (await dao.connect(whale).castVote(proposalId, 1)).wait();

    const receipt = await dao.getVoteReceipt(proposalId, whale.address);
    const proposal = await dao.getProposal(proposalId);
    const expectedCap = (proposal.totalVotingPowerSnapshot * 1000n) / 10000n;
    expect(receipt.weight).to.equal(expectedCap);

    await expect(dao.connect(whale).castVote(proposalId, 1)).to.be.revertedWith("Already voted");
  });

  it("uses snapshot voting power so post-snapshot mint cannot influence vote", async function () {
    const { owner, alice, bob, token, dao } = await deployFixture();

    await (await token.mint(alice.address, ethers.parseEther("100"))).wait();
    await (await token.connect(alice).delegate(alice.address)).wait();
    await mine(2);

    const metadataHash = ethers.keccak256(ethers.toUtf8Bytes("snapshot-test"));
    await (await dao.connect(alice).createProposal(
      1,
      metadataHash,
      await dao.getAddress(),
      0,
      "0x"
    )).wait();
    const proposalId = await dao.proposalCount();
    const proposal = await dao.getProposal(proposalId);

    await (await token.mint(bob.address, ethers.parseEther("10000"))).wait();
    await (await token.connect(bob).delegate(bob.address)).wait();
    await mine(2);

    await time.increase(70);
    await expect(dao.connect(bob).castVote(proposalId, 1)).to.be.revertedWith("No voting power");

    const bobAtSnapshot = await dao.getVotingPowerAt(bob.address, proposal.snapshotBlock);
    expect(bobAtSnapshot).to.equal(0);
  });
});
