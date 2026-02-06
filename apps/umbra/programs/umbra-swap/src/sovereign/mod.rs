use anchor_lang::prelude::*;

/// SOVEREIGN Program ID
pub const SOVEREIGN_PROGRAM_ID: Pubkey = pubkey!("2UAZc1jj4QTSkgrC8U9d4a7EM9AQunxMvW5g7rX7Af9T");

/// SOVEREIGN Identity account structure (for deserialization)
/// This allows Umbra to read SOVEREIGN identity accounts for tiered access
#[account]
#[derive(Default)]
pub struct SovereignIdentity {
    pub owner: Pubkey,
    pub created_at: i64,
    pub trading_authority: Pubkey,
    pub civic_authority: Pubkey,
    pub developer_authority: Pubkey,
    pub infra_authority: Pubkey,
    pub trading_score: u16,
    pub civic_score: u16,
    pub developer_score: u16,
    pub infra_score: u16,
    pub composite_score: u16,
    pub tier: u8,
    pub last_updated: i64,
    pub bump: u8,
}

impl SovereignIdentity {
    pub const SIZE: usize = 8 + 32 + 8 + 32 + 32 + 32 + 32 + 2 + 2 + 2 + 2 + 2 + 1 + 8 + 1;

    /// Tier field offset in the account data
    /// 8 (discriminator) + 32 (owner) + 8 (created_at) + 32*4 (authorities) + 2*4 (scores) + 2 (composite)
    pub const TIER_OFFSET: usize = 8 + 32 + 8 + (32 * 4) + (2 * 4) + 2;

    /// Composite score offset
    pub const COMPOSITE_SCORE_OFFSET: usize = 8 + 32 + 8 + (32 * 4) + (2 * 4);

    /// Trading score offset
    pub const TRADING_SCORE_OFFSET: usize = 8 + 32 + 8 + (32 * 4);
}

/// Derive the PDA for a user's SOVEREIGN identity
pub fn get_identity_pda(owner: &Pubkey) -> (Pubkey, u8) {
    Pubkey::find_program_address(
        &[b"identity", owner.as_ref()],
        &SOVEREIGN_PROGRAM_ID,
    )
}

/// Read SOVEREIGN tier from account data
/// Returns tier 1 if account doesn't exist or data is invalid
pub fn read_sovereign_tier(sovereign_identity: &AccountInfo) -> u8 {
    if sovereign_identity.data_is_empty() {
        return 1; // Default tier
    }

    match sovereign_identity.try_borrow_data() {
        Ok(data) => {
            if data.len() > SovereignIdentity::TIER_OFFSET {
                data[SovereignIdentity::TIER_OFFSET]
            } else {
                1
            }
        }
        Err(_) => 1,
    }
}

/// Read SOVEREIGN composite score from account data
/// Returns 0 if account doesn't exist or data is invalid
pub fn read_sovereign_composite_score(sovereign_identity: &AccountInfo) -> u16 {
    if sovereign_identity.data_is_empty() {
        return 0;
    }

    match sovereign_identity.try_borrow_data() {
        Ok(data) => {
            let offset = SovereignIdentity::COMPOSITE_SCORE_OFFSET;
            if data.len() > offset + 1 {
                u16::from_le_bytes([data[offset], data[offset + 1]])
            } else {
                0
            }
        }
        Err(_) => 0,
    }
}

/// Read SOVEREIGN trading score from account data
/// Returns 0 if account doesn't exist or data is invalid
pub fn read_sovereign_trading_score(sovereign_identity: &AccountInfo) -> u16 {
    if sovereign_identity.data_is_empty() {
        return 0;
    }

    match sovereign_identity.try_borrow_data() {
        Ok(data) => {
            let offset = SovereignIdentity::TRADING_SCORE_OFFSET;
            if data.len() > offset + 1 {
                u16::from_le_bytes([data[offset], data[offset + 1]])
            } else {
                0
            }
        }
        Err(_) => 0,
    }
}

/// Convert SOVEREIGN tier (1-5) to Umbra tier index (0-4)
/// SOVEREIGN: 1=Bronze, 2=Silver, 3=Gold, 4=Platinum, 5=Diamond
/// Umbra:     0=None,   1=Bronze, 2=Silver, 3=Gold,     4=Diamond
pub fn sovereign_tier_to_umbra_index(sovereign_tier: u8) -> usize {
    match sovereign_tier {
        1 => 0,  // Bronze -> None (lowest tier)
        2 => 1,  // Silver -> Bronze
        3 => 2,  // Gold -> Silver
        4 => 3,  // Platinum -> Gold
        5 => 4,  // Diamond -> Diamond
        _ => 0,  // Default to lowest
    }
}

/// Convert SOVEREIGN tier to equivalent FairScore for backward compatibility
/// This allows gradual migration from FairScore to SOVEREIGN
pub fn sovereign_tier_to_fairscore(sovereign_tier: u8) -> u8 {
    match sovereign_tier {
        1 => 10,  // Bronze -> FairScore ~10
        2 => 30,  // Silver -> FairScore ~30
        3 => 50,  // Gold -> FairScore ~50
        4 => 70,  // Platinum -> FairScore ~70
        5 => 90,  // Diamond -> FairScore ~90
        _ => 0,   // No identity -> FairScore 0
    }
}

/// Get privacy tier benefits based on SOVEREIGN tier
#[derive(Clone, Copy)]
pub struct PrivacyBenefits {
    pub fee_discount_bps: u16,      // Fee discount in basis points
    pub max_order_size: u64,        // Maximum order size in lamports
    pub batch_withdrawals: bool,    // Can use batch withdrawals
    pub dark_pool_access: bool,     // Access to dark pool
    pub priority_execution: bool,   // Priority solver execution
}

pub fn get_privacy_benefits(sovereign_tier: u8) -> PrivacyBenefits {
    match sovereign_tier {
        1 => PrivacyBenefits {
            fee_discount_bps: 0,
            max_order_size: 1_000_000_000,      // 1,000 USDC
            batch_withdrawals: false,
            dark_pool_access: false,
            priority_execution: false,
        },
        2 => PrivacyBenefits {
            fee_discount_bps: 500,              // 5% discount
            max_order_size: 10_000_000_000,     // 10,000 USDC
            batch_withdrawals: false,
            dark_pool_access: false,
            priority_execution: false,
        },
        3 => PrivacyBenefits {
            fee_discount_bps: 1500,             // 15% discount
            max_order_size: 100_000_000_000,    // 100,000 USDC
            batch_withdrawals: true,
            dark_pool_access: false,
            priority_execution: false,
        },
        4 => PrivacyBenefits {
            fee_discount_bps: 3000,             // 30% discount
            max_order_size: 1_000_000_000_000,  // 1,000,000 USDC
            batch_withdrawals: true,
            dark_pool_access: true,
            priority_execution: false,
        },
        5 => PrivacyBenefits {
            fee_discount_bps: 5000,             // 50% discount
            max_order_size: u64::MAX,           // Unlimited
            batch_withdrawals: true,
            dark_pool_access: true,
            priority_execution: true,
        },
        _ => PrivacyBenefits {
            fee_discount_bps: 0,
            max_order_size: 1_000_000_000,
            batch_withdrawals: false,
            dark_pool_access: false,
            priority_execution: false,
        },
    }
}

/// Validate SOVEREIGN identity PDA
pub fn validate_sovereign_pda(
    sovereign_identity: &AccountInfo,
    owner: &Pubkey,
) -> bool {
    let (expected_pda, _) = get_identity_pda(owner);
    sovereign_identity.key() == expected_pda
}
