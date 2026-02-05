use anchor_lang::prelude::*;
use super::MevProtectionLevel;

/// Order status
#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq, InitSpace)]
pub enum OrderStatus {
    Pending,
    Executing,
    Completed,
    Cancelled,
    Failed,
}

/// Order type
#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq, InitSpace)]
pub enum OrderType {
    Market,
    Limit,
    Twap,
    Iceberg,
    Dark,
}

impl OrderType {
    pub fn to_bitmask(&self) -> u8 {
        match self {
            OrderType::Market => 1,
            OrderType::Limit => 2,
            OrderType::Twap => 4,
            OrderType::Iceberg => 8,
            OrderType::Dark => 16,
        }
    }
}

/// Encrypted order with tier information
#[account]
#[derive(InitSpace)]
pub struct TieredOrder {
    /// Order creator
    pub owner: Pubkey,

    /// Unique order ID
    pub order_id: u64,

    /// Input token mint
    pub input_mint: Pubkey,

    /// Output token mint
    pub output_mint: Pubkey,

    /// Input amount deposited
    pub input_amount: u64,

    /// Minimum output amount (stored after execution)
    pub min_output_amount: u64,

    /// Actual output amount received
    pub output_amount: u64,

    /// Encrypted order payload
    /// Contains: min_amount, slippage, deadline (encrypted)
    #[max_len(128)]
    pub encrypted_payload: Vec<u8>,

    /// Order status
    pub status: OrderStatus,

    /// Order type
    pub order_type: OrderType,

    /// Creation timestamp
    pub created_at: i64,

    /// Execution timestamp (0 if not executed)
    pub executed_at: i64,

    /// Solver that executed this order (if any)
    pub executed_by: Option<Pubkey>,

    // ============ Tier-Specific Fields ============

    /// User's tier at order creation (0-4: None, Bronze, Silver, Gold, Diamond)
    pub user_tier: u8,

    /// Fee in basis points applied to this order
    pub fee_bps_applied: u16,

    /// Fee amount charged (in output tokens)
    pub fee_amount: u64,

    /// MEV protection level for this order
    pub mev_protection_level: MevProtectionLevel,

    /// FairScore at the time of order creation
    pub fairscore_at_creation: u8,

    /// User's encryption public key (for solver to decrypt)
    #[max_len(32)]
    pub user_encryption_pubkey: Vec<u8>,

    /// Bump seed for PDA
    pub bump: u8,
}

impl TieredOrder {
    pub fn is_cancellable(&self) -> bool {
        self.status == OrderStatus::Pending
    }

    pub fn is_executable(&self) -> bool {
        self.status == OrderStatus::Pending
    }

    pub fn is_claimable(&self) -> bool {
        self.status == OrderStatus::Completed
    }

    /// Calculate fee amount from output
    pub fn calculate_fee(&self, output_amount: u64) -> u64 {
        (output_amount as u128 * self.fee_bps_applied as u128 / 10000) as u64
    }

    /// Get tier name
    pub fn get_tier_name(&self) -> &'static str {
        match self.user_tier {
            0 => "None",
            1 => "Bronze",
            2 => "Silver",
            3 => "Gold",
            4 => "Diamond",
            _ => "Unknown",
        }
    }
}

/// FairScore proof for on-chain verification
#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct FairScoreProof {
    /// Wallet address this proof is for
    pub wallet: Pubkey,
    /// FairScore value (0-100)
    pub score: u8,
    /// Tier level (0-4)
    pub tier: u8,
    /// Timestamp when the proof was created
    pub timestamp: i64,
    /// Signature from FairScale (Ed25519)
    pub signature: [u8; 64],
}
