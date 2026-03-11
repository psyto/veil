import { ethers } from "hardhat";

async function main() {
  const contractAddress = process.env.CONTRACT_ADDRESS;
  if (!contractAddress) {
    throw new Error("CONTRACT_ADDRESS environment variable is required");
  }

  console.log("Verifying deployment at:", contractAddress);

  const Router = await ethers.getContractFactory("ConfidentialSwapRouter");
  const router = Router.attach(contractAddress);

  const config = await router.solverConfig();

  console.log("\nSolver config:");
  console.log("  Authority:", config.authority);
  console.log("  Encryption public key:", config.encryptionPubKey);
  console.log("  Fee (bps):", config.feeBps.toString());
  console.log("  Total orders:", config.totalOrders.toString());
  console.log("  Total volume:", config.totalVolume.toString());
  console.log("  Is active:", config.isActive);

  if (config.authority === ethers.ZeroAddress) {
    console.log("\nWARNING: Solver is NOT initialized (authority is zero address).");
    process.exitCode = 1;
    return;
  }

  if (!config.isActive) {
    console.log("\nWARNING: Solver is initialized but NOT active.");
    process.exitCode = 1;
    return;
  }

  console.log("\nSolver is initialized and active.");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
