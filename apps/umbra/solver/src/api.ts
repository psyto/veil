import express, { Request, Response } from 'express';
import { UmbraSolver } from './solver';

export function startApi(solver: UmbraSolver, port: number): void {
  const app = express();
  app.use(express.json());

  /**
   * Health check
   */
  app.get('/api/health', (req: Request, res: Response) => {
    const stats = solver.getStats();
    res.json({
      success: true,
      status: 'healthy',
      solver: stats,
    });
  });

  /**
   * Get solver's encryption public key
   * Users need this to encrypt their orders
   */
  app.get('/api/solver-pubkey', (req: Request, res: Response) => {
    const pubkey = solver.getEncryptionPublicKey();
    res.json({
      success: true,
      encryptionPubkey: Buffer.from(pubkey).toString('hex'),
      encryptionPubkeyBase64: Buffer.from(pubkey).toString('base64'),
    });
  });

  /**
   * Get solver stats
   */
  app.get('/api/stats', (req: Request, res: Response) => {
    const stats = solver.getStats();
    res.json({
      success: true,
      stats,
    });
  });

  /**
   * Get tier information
   */
  app.get('/api/tiers', (req: Request, res: Response) => {
    const tiers = [
      {
        tier: 0,
        name: 'None',
        minFairscore: 0,
        feeBps: 50,
        mevProtection: 'none',
        orderTypes: ['market'],
        derivatives: [],
      },
      {
        tier: 1,
        name: 'Bronze',
        minFairscore: 20,
        feeBps: 30,
        mevProtection: 'basic',
        orderTypes: ['market', 'limit'],
        derivatives: [],
      },
      {
        tier: 2,
        name: 'Silver',
        minFairscore: 40,
        feeBps: 15,
        mevProtection: 'full',
        orderTypes: ['market', 'limit', 'twap'],
        derivatives: ['perpetuals'],
      },
      {
        tier: 3,
        name: 'Gold',
        minFairscore: 60,
        feeBps: 8,
        mevProtection: 'priority',
        orderTypes: ['market', 'limit', 'twap', 'iceberg'],
        derivatives: ['perpetuals', 'variance'],
      },
      {
        tier: 4,
        name: 'Diamond',
        minFairscore: 80,
        feeBps: 5,
        mevProtection: 'priority',
        orderTypes: ['market', 'limit', 'twap', 'iceberg', 'dark'],
        derivatives: ['perpetuals', 'variance', 'exotic'],
      },
    ];

    res.json({
      success: true,
      tiers,
    });
  });

  /**
   * Calculate fee for a given FairScore
   */
  app.get('/api/fee/:fairscore', (req: Request, res: Response) => {
    const fairscore = parseInt(req.params.fairscore);

    if (isNaN(fairscore) || fairscore < 0 || fairscore > 100) {
      return res.status(400).json({
        success: false,
        error: 'Invalid FairScore. Must be between 0 and 100.',
      });
    }

    let tier: number;
    let feeBps: number;
    let tierName: string;

    if (fairscore >= 80) {
      tier = 4;
      feeBps = 5;
      tierName = 'Diamond';
    } else if (fairscore >= 60) {
      tier = 3;
      feeBps = 8;
      tierName = 'Gold';
    } else if (fairscore >= 40) {
      tier = 2;
      feeBps = 15;
      tierName = 'Silver';
    } else if (fairscore >= 20) {
      tier = 1;
      feeBps = 30;
      tierName = 'Bronze';
    } else {
      tier = 0;
      feeBps = 50;
      tierName = 'None';
    }

    res.json({
      success: true,
      fairscore,
      tier,
      tierName,
      feeBps,
      feePercent: feeBps / 100,
    });
  });

  app.listen(port, () => {
    console.log(`Umbra Solver API listening on port ${port}`);
    console.log(`  Health: http://localhost:${port}/api/health`);
    console.log(`  Solver Pubkey: http://localhost:${port}/api/solver-pubkey`);
    console.log(`  Tiers: http://localhost:${port}/api/tiers`);
  });
}
