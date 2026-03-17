const hre = require("hardhat");

async function main() {
  const Factory = await hre.ethers.getContractFactory("LulitPostRegistry");
  const contract = await Factory.deploy();
  await contract.waitForDeployment();

  console.log("LulitPostRegistry deployed to:", await contract.getAddress());
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
