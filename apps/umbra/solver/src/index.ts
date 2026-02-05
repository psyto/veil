import { config } from 'dotenv';
config();

import { UmbraSolver } from './solver';
import { startApi } from './api';

async function main() {
  console.log('Starting Umbra Solver...');

  const rpcUrl = process.env.RPC_URL || 'https://api.devnet.solana.com';
  const keypairPath = process.env.SOLVER_KEYPAIR_PATH || '~/.config/solana/id.json';
  const fairScoreApiKey = process.env.FAIRSCALE_API_KEY || '';
  const pollIntervalMs = parseInt(process.env.POLL_INTERVAL_MS || '5000');
  const apiPort = parseInt(process.env.API_PORT || '3001');

  // Start the solver
  const solver = new UmbraSolver({
    rpcUrl,
    keypairPath,
    fairScoreApiKey,
    pollIntervalMs,
  });

  await solver.start();

  // Start the API
  startApi(solver, apiPort);

  console.log(`Umbra Solver running on port ${apiPort}`);
}

main().catch(console.error);
