/**
 * Pump.fun Type Definitions
 */

/**
 * Token data from Pump.fun API
 */
export interface PumpFunToken {
  /** Token mint address */
  mint: string;
  /** Token name */
  name: string;
  /** Token symbol */
  symbol: string;
  /** Token description */
  description: string;
  /** Token image URI */
  image_uri: string;
  /** Metadata URI */
  metadata_uri: string;
  /** Creator wallet address */
  creator: string;
  /** Unix timestamp of creation */
  created_timestamp: number;
  /** Market cap in SOL */
  market_cap: number;
  /** Market cap in USD */
  usd_market_cap: number;
  /** Whether bonding curve is complete (graduated to Raydium) */
  complete: boolean;
  /** Virtual SOL reserves in bonding curve */
  virtual_sol_reserves: number;
  /** Virtual token reserves in bonding curve */
  virtual_token_reserves: number;
  /** Reply count */
  reply_count?: number;
  /** Last reply timestamp */
  last_reply?: number;
  /** Website URL */
  website?: string;
  /** Twitter handle */
  twitter?: string;
  /** Telegram link */
  telegram?: string;
  /** Whether token is NSFW */
  nsfw?: boolean;
  /** King of the hill timestamp */
  king_of_the_hill_timestamp?: number;
  /** Whether currently king of the hill */
  is_currently_live?: boolean;
}

/**
 * Token trade/transaction from Pump.fun
 */
export interface PumpFunTrade {
  /** Transaction signature */
  signature: string;
  /** Mint address */
  mint: string;
  /** SOL amount */
  sol_amount: number;
  /** Token amount */
  token_amount: number;
  /** Whether this is a buy (true) or sell (false) */
  is_buy: boolean;
  /** User wallet address */
  user: string;
  /** Unix timestamp */
  timestamp: number;
  /** Virtual SOL reserves after trade */
  virtual_sol_reserves: number;
  /** Virtual token reserves after trade */
  virtual_token_reserves: number;
}

/**
 * Bonding curve state
 */
export interface BondingCurveState {
  /** Virtual SOL reserves */
  virtualSolReserves: number;
  /** Virtual token reserves */
  virtualTokenReserves: number;
  /** Constant product k = x * y */
  k: number;
  /** Current token price in SOL */
  currentPrice: number;
  /** Market cap in SOL */
  marketCapSol: number;
  /** Progress toward graduation (0-100%) */
  graduationProgress: number;
}

/**
 * Purchase calculation result
 */
export interface PurchaseCalculation {
  /** Amount of tokens to receive */
  tokenAmount: bigint;
  /** Price impact percentage */
  priceImpact: number;
  /** Average price per token in SOL */
  averagePrice: number;
  /** New token price after purchase */
  newPrice: number;
}

/**
 * Sort options for token listing
 */
export type TokenSortOption =
  | "market_cap"
  | "created_timestamp"
  | "last_reply"
  | "reply_count";

/**
 * Token filter options
 */
export interface TokenFilterOptions {
  /** Sort by field */
  sort?: TokenSortOption;
  /** Sort order */
  order?: "ASC" | "DESC";
  /** Limit results */
  limit?: number;
  /** Offset for pagination */
  offset?: number;
  /** Include NSFW tokens */
  includeNsfw?: boolean;
}
