import { ethers } from "hardhat";

// Configurable via environment variables
const ENCRYPTION_PUB_KEY =
  process.env.ENCRYPTION_PUB_KEY ||
  "0x0000000000000000000000000000000000000000000000000000000000000001";
const FEE_BPS = parseInt(process.env.FEE_BPS || "30", 10);

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying ConfidentialSwapRouter with account:", deployer.address);
  console.log("Account balance:", (await ethers.provider.getBalance(deployer.address)).toString());

  // Deploy the contract
  const Router = await ethers.getContractFactory("ConfidentialSwapRouter");
  const router = await Router.deploy();
  await router.waitForDeployment();

  const routerAddress = await router.getAddress();
  console.log("ConfidentialSwapRouter deployed to:", routerAddress);

  // Initialize the solver
  console.log("Initializing solver...");
  console.log("  Encryption public key:", ENCRYPTION_PUB_KEY);
  console.log("  Fee (bps):", FEE_BPS);

  const tx = await router.initializeSolver(ENCRYPTION_PUB_KEY, FEE_BPS);
  await tx.wait();
  console.log("Solver initialized (tx:", tx.hash, ")");

  // Verify the solver config is set
  const config = await router.solverConfig();
  console.log("\nSolver config verification:");
  console.log("  Authority:", config.authority);
  console.log("  Encryption public key:", config.encryptionPubKey);
  console.log("  Fee (bps):", config.feeBps.toString());
  console.log("  Is active:", config.isActive);

  if (config.authority !== deployer.address) {
    throw new Error("Solver authority does not match deployer address");
  }
  if (!config.isActive) {
    throw new Error("Solver is not active after initialization");
  }

  console.log("\nDeployment complete and verified.");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
