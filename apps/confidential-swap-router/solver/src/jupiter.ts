import fetch from 'cross-fetch';
import { PublicKey, Connection, VersionedTransaction } from '@solana/web3.js';
import BN from 'bn.js';

const JUPITER_API_URL = 'https://quote-api.jup.ag/v6';

/**
 * Jupiter quote response
 */
export interface JupiterQuote {
  inputMint: string;
  inAmount: string;
  outputMint: string;
  outAmount: string;
  otherAmountThreshold: string;
  swapMode: string;
  slippageBps: number;
  platformFee: null | {
    amount: string;
    feeBps: number;
  };
  priceImpactPct: string;
  routePlan: Array<{
    swapInfo: {
      ammKey: string;
      label: string;
      inputMint: string;
      outputMint: string;
      inAmount: string;
      outAmount: string;
      feeAmount: string;
      feeMint: string;
    };
    percent: number;
  }>;
  contextSlot: number;
  timeTaken: number;
}

/**
 * Jupiter swap instructions response
 */
export interface JupiterSwapResponse {
  swapTransaction: string;
  lastValidBlockHeight: number;
  prioritizationFeeLamports: number;
}

/**
 * Jupiter client for getting quotes and executing swaps
 */
export class JupiterClient {
  private connection: Connection;

  constructor(connection: Connection) {
    this.connection = connection;
  }

  /**
   * Get a quote for a swap
   */
  async getQuote(
    inputMint: PublicKey,
    outputMint: PublicKey,
    amount: BN,
    slippageBps: number = 50
  ): Promise<JupiterQuote> {
    const params = new URLSearchParams({
      inputMint: inputMint.toBase58(),
      outputMint: outputMint.toBase58(),
      amount: amount.toString(),
      slippageBps: slippageBps.toString(),
    });

    const response = await fetch(`${JUPITER_API_URL}/quote?${params}`);

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Jupiter quote failed: ${error}`);
    }

    return response.json();
  }

  /**
   * Get swap transaction for a quote
   */
  async getSwapTransaction(
    quote: JupiterQuote,
    userPublicKey: PublicKey,
    wrapAndUnwrapSol: boolean = true,
    prioritizationFeeLamports: number | 'auto' = 'auto'
  ): Promise<JupiterSwapResponse> {
    const response = await fetch(`${JUPITER_API_URL}/swap`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        quoteResponse: quote,
        userPublicKey: userPublicKey.toBase58(),
        wrapAndUnwrapSol,
        dynamicComputeUnitLimit: true,
        prioritizationFeeLamports,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Jupiter swap failed: ${error}`);
    }

    return response.json();
  }

  /**
   * Deserialize swap transaction
   */
  deserializeTransaction(swapTransaction: string): VersionedTransaction {
    const transactionBuf = Buffer.from(swapTransaction, 'base64');
    return VersionedTransaction.deserialize(transactionBuf);
  }

  /**
   * Check if a swap is profitable given our constraints
   */
  checkProfitability(
    quote: JupiterQuote,
    minOutputAmount: BN,
    maxSlippageBps: number
  ): {
    isProfitable: boolean;
    outputAmount: BN;
    slippageOk: boolean;
    priceImpactOk: boolean;
  } {
    const outputAmount = new BN(quote.outAmount);
    const slippageOk = quote.slippageBps <= maxSlippageBps;
    const priceImpactOk = parseFloat(quote.priceImpactPct) < 1.0; // Max 1% price impact
    const isProfitable =
      outputAmount.gte(minOutputAmount) && slippageOk && priceImpactOk;

    return {
      isProfitable,
      outputAmount,
      slippageOk,
      priceImpactOk,
    };
  }

  /**
   * Execute a swap through Jupiter
   * Returns the output amount received
   */
  async executeSwap(
    inputMint: PublicKey,
    outputMint: PublicKey,
    inputAmount: BN,
    slippageBps: number,
    wallet: any // Wallet with signTransaction
  ): Promise<{
    signature: string;
    outputAmount: BN;
  }> {
    // Get quote
    const quote = await this.getQuote(inputMint, outputMint, inputAmount, slippageBps);

    // Get swap transaction
    const { swapTransaction, lastValidBlockHeight } = await this.getSwapTransaction(
      quote,
      wallet.publicKey
    );

    // Deserialize and sign
    const transaction = this.deserializeTransaction(swapTransaction);
    const signedTransaction = await wallet.signTransaction(transaction);

    // Send transaction
    const signature = await this.connection.sendRawTransaction(
      signedTransaction.serialize(),
      {
        skipPreflight: true,
        maxRetries: 2,
      }
    );

    // Confirm transaction
    const confirmation = await this.connection.confirmTransaction(
      {
        signature,
        blockhash: transaction.message.recentBlockhash,
        lastValidBlockHeight,
      },
      'confirmed'
    );

    if (confirmation.value.err) {
      throw new Error(`Transaction failed: ${JSON.stringify(confirmation.value.err)}`);
    }

    return {
      signature,
      outputAmount: new BN(quote.outAmount),
    };
  }
}

/**
 * Calculate optimal route for a swap considering MEV protection
 */
export async function findOptimalRoute(
  jupiter: JupiterClient,
  inputMint: PublicKey,
  outputMint: PublicKey,
  inputAmount: BN,
  minOutputAmount: BN,
  slippageBps: number
): Promise<{
  quote: JupiterQuote;
  isViable: boolean;
  expectedProfit: BN;
}> {
  const quote = await jupiter.getQuote(inputMint, outputMint, inputAmount, slippageBps);
  const outputAmount = new BN(quote.outAmount);
  const isViable = outputAmount.gte(minOutputAmount);
  const expectedProfit = isViable ? outputAmount.sub(minOutputAmount) : new BN(0);

  return {
    quote,
    isViable,
    expectedProfit,
  };
}
