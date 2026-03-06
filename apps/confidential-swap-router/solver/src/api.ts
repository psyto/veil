import express, { Request, Response, Router } from 'express';
import cors from 'cors';
import { PublicKey } from '@solana/web3.js';
import { ConfidentialSwapSolver } from './solver';

/**
 * Create Express API router for solver pubkey exchange
 */
export function createSolverApiRouter(solver: ConfidentialSwapSolver): Router {
  const router = Router();

  /**
   * GET /api/solver-pubkey
   * Returns the solver's encryption public key (hex encoded)
   */
  router.get('/solver-pubkey', (req: Request, res: Response) => {
    try {
      const encryptionPubkey = solver.getEncryptionPublicKey();
      res.json({
        success: true,
        encryptionPubkey: Buffer.from(encryptionPubkey).toString('hex'),
        encryptionPubkeyBase64: Buffer.from(encryptionPubkey).toString('base64'),
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to get solver pubkey',
      });
    }
  });

  /**
   * POST /api/register-encryption-pubkey
   * Registers a user's encryption public key
   * Body: { userAddress: string, encryptionPubkey: string (hex) }
   */
  router.post('/register-encryption-pubkey', (req: Request, res: Response) => {
    try {
      const { userAddress, encryptionPubkey } = req.body;

      // Validate userAddress
      if (!userAddress || typeof userAddress !== 'string') {
        res.status(400).json({
          success: false,
          error: 'userAddress is required and must be a string',
        });
        return;
      }

      // Validate it's a valid Solana address
      try {
        new PublicKey(userAddress);
      } catch {
        res.status(400).json({
          success: false,
          error: 'Invalid Solana address',
        });
        return;
      }

      // Validate encryptionPubkey
      if (!encryptionPubkey || typeof encryptionPubkey !== 'string') {
        res.status(400).json({
          success: false,
          error: 'encryptionPubkey is required and must be a hex string',
        });
        return;
      }

      // Parse encryption pubkey from hex
      let pubkeyBytes: Uint8Array;
      try {
        pubkeyBytes = new Uint8Array(Buffer.from(encryptionPubkey, 'hex'));
        if (pubkeyBytes.length !== 32) {
          throw new Error('Invalid length');
        }
      } catch {
        res.status(400).json({
          success: false,
          error: 'encryptionPubkey must be a 32-byte hex string (64 characters)',
        });
        return;
      }

      // Register the pubkey
      ConfidentialSwapSolver.registerUserEncryptionPubkey(userAddress, pubkeyBytes);

      res.json({
        success: true,
        message: `Encryption pubkey registered for ${userAddress}`,
        registeredUsers: ConfidentialSwapSolver.getRegisteredUserCount(),
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to register encryption pubkey',
      });
    }
  });

  /**
   * GET /api/health
   * Health check endpoint
   */
  router.get('/health', (req: Request, res: Response) => {
    res.json({
      success: true,
      status: 'healthy',
      registeredUsers: ConfidentialSwapSolver.getRegisteredUserCount(),
    });
  });

  return router;
}

/**
 * Create and start the Express API server
 */
export function createSolverApiServer(solver: ConfidentialSwapSolver, port: number = 3001): express.Application {
  const app = express();

  // Middleware
  app.use(cors());
  app.use(express.json());

  // Mount API routes
  app.use('/api', createSolverApiRouter(solver));

  // Root endpoint
  app.get('/', (req: Request, res: Response) => {
    res.json({
      name: 'Confidential Swap Router Solver API',
      version: '1.0.0',
      endpoints: [
        'GET /api/solver-pubkey - Get solver encryption pubkey',
        'POST /api/register-encryption-pubkey - Register user encryption pubkey',
        'GET /api/health - Health check',
      ],
    });
  });

  // Start server
  app.listen(port, () => {
    console.log(`Solver API server running at http://localhost:${port}`);
    console.log(`Solver encryption pubkey available at http://localhost:${port}/api/solver-pubkey`);
  });

  return app;
}
