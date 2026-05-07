const hre = require("hardhat");
const fs = require("fs");

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  console.log("Deploying contracts with:", deployer.address);
  console.log("Balance:", (await deployer.provider.getBalance(deployer.address)).toString());

  // 1. Deploy MineRegistry
  const MineRegistry = await hre.ethers.getContractFactory("MineRegistry");
  const mineRegistry = await MineRegistry.deploy();
  console.log("MineRegistry deployed to:", mineRegistry.target);

  // 2. Deploy BatchTracking (depends on MineRegistry)
  const BatchTracking = await hre.ethers.getContractFactory("BatchTracking");
  const batchTracking = await BatchTracking.deploy(mineRegistry.target);
  console.log("BatchTracking deployed to:", batchTracking.target);

  // 3. Deploy ComplianceVerifier (depends on both)
  const ComplianceVerifier = await hre.ethers.getContractFactory("ComplianceVerifier");
  const complianceVerifier = await ComplianceVerifier.deploy(
    batchTracking.target,
    mineRegistry.target
  );
  console.log("ComplianceVerifier deployed to:", complianceVerifier.target);

  // Save addresses for backend
  const addresses = {
    mineRegistry: mineRegistry.target,
    batchTracking: batchTracking.target,
    complianceVerifier: complianceVerifier.target,
    network: hre.network.name,
    deployedAt: new Date().toISOString(),
  };

  fs.writeFileSync(
    "./deployed-addresses.json",
    JSON.stringify(addresses, null, 2)
  );
  console.log("Addresses saved to deployed-addresses.json");

  // Also copy ABIs
  const contracts = ["MineRegistry", "BatchTracking", "ComplianceVerifier"];
  fs.mkdirSync("../backend/abis", { recursive: true });
  for (const name of contracts) {
    const artifact = await hre.artifacts.readArtifact(name);
    fs.writeFileSync(`../backend/abis/${name}.json`, JSON.stringify(artifact.abi, null, 2));
    console.log(`ABI exported: ${name}.json`);
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
