import { PublicKey } from '@solana/web3.js';
import { DarkFlowClient } from './darkflow';
import { DarkPoolConfig, DarkPoolState, PoolAggregates, TxResult } from './types';

/**
 * Pool-specific operations for DarkFlow
 */
export class DarkPoolOperations {
  constructor(private client: DarkFlowClient) {}

  /**
   * Create a new dark liquidity pool
   */
  async createPool(config: DarkPoolConfig): Promise<TxResult> {
    return this.client.initializePool(config);
  }

  /**
   * Get pool state
   */
  async getState(poolAddress: PublicKey): Promise<DarkPoolState | null> {
    return this.client.getPoolState(poolAddress);
  }

  /**
   * Get pool aggregates (public stats)
   */
  async getAggregates(poolAddress: PublicKey): Promise<PoolAggregates | null> {
    return this.client.getPoolAggregates(poolAddress);
  }

  /**
   * Find pool address for a token pair
   */
  static findPoolAddress(
    tokenAMint: PublicKey,
    tokenBMint: PublicKey,
    programId: PublicKey = new PublicKey('DFLow1111111111111111111111111111111111111')
  ): PublicKey {
    const [poolAddress] = PublicKey.findProgramAddressSync(
      [Buffer.from('dark_pool'), tokenAMint.toBuffer(), tokenBMint.toBuffer()],
      programId
    );
    return poolAddress;
  }

  /**
   * Calculate pool fee for an amount
   */
  static calculateFee(amount: bigint, feeRateBps: number): bigint {
    return (amount * BigInt(feeRateBps)) / BigInt(10000);
  }
}
