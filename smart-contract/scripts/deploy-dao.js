const fs = require("fs");
const path = require("path");
const hre = require("hardhat");

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  console.log("Deploying with:", deployer.address);

  const Token = await hre.ethers.getContractFactory("LulitGovernanceToken");
  const token = await Token.deploy(deployer.address);
  await token.waitForDeployment();

  const Treasury = await hre.ethers.getContractFactory("LulitDAOTreasury");
  const treasury = await Treasury.deploy(deployer.address);
  await treasury.waitForDeployment();

  const DAO = await hre.ethers.getContractFactory("LulitDAO");
  const dao = await DAO.deploy(await token.getAddress(), await treasury.getAddress(), deployer.address);
  await dao.waitForDeployment();

  // Transfer treasury ownership to DAO so only passed proposals can release funds.
  await (await treasury.transferOwnership(await dao.getAddress())).wait();

  // Seed deployer for bootstrap voting.
  await (await token.mint(deployer.address, hre.ethers.parseEther("1000000"))).wait();

  const deployment = {
    network: hre.network.name,
    deployer: deployer.address,
    token: await token.getAddress(),
    treasury: await treasury.getAddress(),
    dao: await dao.getAddress()
  };

  const outPath = path.join(__dirname, "..", "deployment", `dao-${hre.network.name}.json`);
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, JSON.stringify(deployment, null, 2));

  console.log("DAO deployment:", deployment);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
