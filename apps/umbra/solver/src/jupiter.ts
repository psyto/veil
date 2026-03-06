import { Connection, PublicKey, VersionedTransaction } from '@solana/web3.js';
import { BN } from '@coral-xyz/anchor';

const JUPITER_API_URL = 'https://quote-api.jup.ag/v6';

export interface JupiterQuote {
  inputMint: string;
  inAmount: string;
  outputMint: string;
  outAmount: string;
  otherAmountThreshold: string;
  swapMode: string;
  slippageBps: number;
  priceImpactPct: string;
  routePlan: any[];
}

export interface JupiterSwapResponse {
  swapTransaction: string;
  lastValidBlockHeight: number;
}

export class JupiterClient {
  private connection: Connection;

  constructor(connection: Connection) {
    this.connection = connection;
  }

  /**
   * Get quote from Jupiter
   */
  async getQuote(
    inputMint: PublicKey,
    outputMint: PublicKey,
    amount: BN,
    slippageBps: number = 50
  ): Promise<JupiterQuote> {
    const url = new URL(`${JUPITER_API_URL}/quote`);
    url.searchParams.set('inputMint', inputMint.toString());
    url.searchParams.set('outputMint', outputMint.toString());
    url.searchParams.set('amount', amount.toString());
    url.searchParams.set('slippageBps', slippageBps.toString());

    const response = await fetch(url.toString());

    if (!response.ok) {
      throw new Error(`Jupiter quote failed: ${response.status}`);
    }

    return response.json();
  }

  /**
   * Get swap transaction from Jupiter
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
        userPublicKey: userPublicKey.toString(),
        wrapAndUnwrapSol,
        prioritizationFeeLamports,
      }),
    });

    if (!response.ok) {
      throw new Error(`Jupiter swap failed: ${response.status}`);
    }

    return response.json();
  }

  /**
   * Deserialize swap transaction
   */
  deserializeTransaction(swapTransaction: string): VersionedTransaction {
    const swapTransactionBuf = Buffer.from(swapTransaction, 'base64');
    return VersionedTransaction.deserialize(swapTransactionBuf);
  }

  /**
   * Check if quote is profitable
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
    const priceImpactOk = parseFloat(quote.priceImpactPct) < 1.0; // < 1%
    const meetsMinOutput = outputAmount.gte(minOutputAmount);

    return {
      isProfitable: meetsMinOutput && slippageOk && priceImpactOk,
      outputAmount,
      slippageOk,
      priceImpactOk,
    };
  }

  /**
   * Execute swap (get quote + transaction + send)
   */
  async executeSwap(
    inputMint: PublicKey,
    outputMint: PublicKey,
    inputAmount: BN,
    slippageBps: number,
    wallet: any
  ): Promise<{ signature: string; outputAmount: BN }> {
    // Get quote
    const quote = await this.getQuote(inputMint, outputMint, inputAmount, slippageBps);

    // Get swap transaction
    const { swapTransaction, lastValidBlockHeight } = await this.getSwapTransaction(
      quote,
      wallet.publicKey
    );

    // Deserialize and sign
    const transaction = this.deserializeTransaction(swapTransaction);
    transaction.sign([wallet]);

    // Send transaction
    const rawTransaction = transaction.serialize();
    const signature = await this.connection.sendRawTransaction(rawTransaction, {
      skipPreflight: true,
      maxRetries: 3,
    });

    // Confirm
    await this.connection.confirmTransaction({
      signature,
      blockhash: transaction.message.recentBlockhash,
      lastValidBlockHeight,
    });

    return {
      signature,
      outputAmount: new BN(quote.outAmount),
    };
  }
}
