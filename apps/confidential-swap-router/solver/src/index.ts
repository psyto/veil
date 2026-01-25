import { ConfidentialSwapSolver, createSolverConfig } from './solver';

async function main() {
  console.log('=== Confidential Swap Router Solver ===');
  console.log('');

  try {
    const config = createSolverConfig();
    const solver = new ConfidentialSwapSolver(config);

    // Handle shutdown gracefully
    process.on('SIGINT', () => {
      console.log('\nReceived SIGINT, shutting down...');
      solver.stop();
      process.exit(0);
    });

    process.on('SIGTERM', () => {
      console.log('\nReceived SIGTERM, shutting down...');
      solver.stop();
      process.exit(0);
    });

    await solver.start();
  } catch (error) {
    console.error('Fatal error:', error);
    process.exit(1);
  }
}

main();

export { ConfidentialSwapSolver, createSolverConfig } from './solver';
export { JupiterClient, findOptimalRoute } from './jupiter';
