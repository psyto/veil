use anchor_lang::prelude::*;

#[constant]
pub const SOLVER_CONFIG_SEED: &[u8] = b"solver_config";

#[constant]
pub const ORDER_SEED: &[u8] = b"encrypted_order";

#[constant]
pub const ORDER_VAULT_SEED: &[u8] = b"order_vault";

#[constant]
pub const OUTPUT_VAULT_SEED: &[u8] = b"output_vault";

/// Maximum fee in basis points (5% = 500 bps)
#[constant]
pub const MAX_FEE_BPS: u16 = 500;

/// Minimum encrypted payload size (nonce + minimal data)
#[constant]
pub const MIN_PAYLOAD_SIZE: usize = 24;

/// Maximum encrypted payload size
#[constant]
pub const MAX_PAYLOAD_SIZE: usize = 128;
