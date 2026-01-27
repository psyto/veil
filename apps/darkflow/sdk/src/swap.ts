import { PublicKey } from '@solana/web3.js';
import { DarkFlowClient } from './darkflow';
import { DarkSwapParams, DarkOrderState, OrderStatus, TxResult } from './types';

/**
 * Swap operations for DarkFlow
 */
export class SwapOperations {
  constructor(private client: DarkFlowClient) {}

  /**
   * Execute an instant dark swap
   *
   * The swap happens immediately with ZK proof verification.
   * Nobody can see the amount you're swapping.
   */
  async instantSwap(params: DarkSwapParams): Promise<TxResult> {
    return this.client.darkSwap(params);
  }

  /**
   * Submit a dark order for later execution
   *
   * Useful for larger swaps or when you want solver competition.
   */
  async submitOrder(params: DarkSwapParams): Promise<TxResult> {
    return this.client.submitDarkOrder(params);
  }

  /**
   * Cancel a pending order
   */
  async cancelOrder(orderAddress: PublicKey): Promise<TxResult> {
    return this.client.cancelDarkOrder(orderAddress);
  }

  /**
   * Get order state
   */
  async getOrder(orderAddress: PublicKey): Promise<DarkOrderState | null> {
    return this.client.getOrder(orderAddress);
  }

  /**
   * Get all pending orders for the current user
   */
  async getUserPendingOrders(): Promise<DarkOrderState[]> {
    // In production, query orders owned by wallet with status = Pending
    return [];
  }

  /**
   * Calculate expected output for a swap
   *
   * Note: This is an estimate. Actual output depends on pool state at execution.
   */
  static calculateExpectedOutput(
    inputAmount: bigint,
    reserveIn: bigint,
    reserveOut: bigint,
    feeRateBps: number
  ): bigint {
    // Constant product formula with fee
    const feeFactor = BigInt(10000 - feeRateBps);
    const numerator = reserveOut * inputAmount * feeFactor;
    const denominator = reserveIn * BigInt(10000) + inputAmount * feeFactor;

    return numerator / denominator;
  }

  /**
   * Calculate price impact for a swap
   */
  static calculatePriceImpact(
    inputAmount: bigint,
    reserveIn: bigint,
    reserveOut: bigint
  ): number {
    // Price impact = 1 - (output / (input * price))
    const spotPrice = Number(reserveOut) / Number(reserveIn);
    const expectedOutput = SwapOperations.calculateExpectedOutput(
      inputAmount,
      reserveIn,
      reserveOut,
      0 // Ignore fee for price impact
    );

    const actualPrice = Number(expectedOutput) / Number(inputAmount);
    const impact = 1 - actualPrice / spotPrice;

    return impact * 100; // Return as percentage
  }

  /**
   * Find order address
   */
  static findOrderAddress(
    pool: PublicKey,
    maker: PublicKey,
    orderIndex: number,
    programId: PublicKey = new PublicKey('DFLow1111111111111111111111111111111111111')
  ): PublicKey {
    const [orderAddress] = PublicKey.findProgramAddressSync(
      [
        Buffer.from('dark_order'),
        pool.toBuffer(),
        maker.toBuffer(),
        Buffer.from(new Uint8Array(new BigUint64Array([BigInt(orderIndex)]).buffer)),
      ],
      programId
    );
    return orderAddress;
  }
}
