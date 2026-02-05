use anchor_lang::prelude::*;

#[constant]
pub const TIER_CONFIG_SEED: &[u8] = b"tier_config";

#[constant]
pub const ORDER_SEED: &[u8] = b"tiered_order";

#[constant]
pub const ORDER_VAULT_SEED: &[u8] = b"order_vault";

#[constant]
pub const OUTPUT_VAULT_SEED: &[u8] = b"output_vault";

#[constant]
pub const FEE_VAULT_SEED: &[u8] = b"fee_vault";

/// Maximum fee in basis points (5% = 500 bps)
#[constant]
pub const MAX_FEE_BPS: u16 = 500;

/// Minimum fee in basis points (0.01% = 1 bps)
#[constant]
pub const MIN_FEE_BPS: u16 = 1;

/// Minimum encrypted payload size (nonce + minimal data)
#[constant]
pub const MIN_PAYLOAD_SIZE: usize = 24;

/// Maximum encrypted payload size
#[constant]
pub const MAX_PAYLOAD_SIZE: usize = 128;

/// Maximum FairScore value
#[constant]
pub const MAX_FAIRSCORE: u8 = 100;

/// Number of tiers
#[constant]
pub const NUM_TIERS: usize = 5;

/// Maximum proof age in seconds (10 minutes)
#[constant]
pub const MAX_PROOF_AGE_SECONDS: i64 = 600;

/// Order type bitmasks
pub mod order_types {
    pub const MARKET: u8 = 1;
    pub const LIMIT: u8 = 2;
    pub const TWAP: u8 = 4;
    pub const ICEBERG: u8 = 8;
    pub const DARK: u8 = 16;
}

/// Derivative access bitmasks
pub mod derivatives {
    pub const PERPETUALS: u8 = 1;
    pub const VARIANCE: u8 = 2;
    pub const EXOTIC: u8 = 4;
}
