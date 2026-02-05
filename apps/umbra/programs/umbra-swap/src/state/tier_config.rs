use anchor_lang::prelude::*;

/// MEV protection levels
#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq, InitSpace, Debug)]
pub enum MevProtectionLevel {
    None,     // No protection
    Basic,    // Delayed reveal
    Full,     // Full encryption
    Priority, // Full + priority execution
}

impl Default for MevProtectionLevel {
    fn default() -> Self {
        MevProtectionLevel::None
    }
}

/// Definition for a single tier
#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, InitSpace)]
pub struct TierDefinition {
    /// Minimum FairScore required for this tier (0-100)
    pub min_fairscore: u8,
    /// Fee in basis points (e.g., 50 = 0.5%)
    pub fee_bps: u16,
    /// MEV protection level for this tier
    pub mev_protection_level: MevProtectionLevel,
    /// Allowed order types (bitmask: 1=market, 2=limit, 4=twap, 8=iceberg, 16=dark)
    pub allowed_order_types: u8,
    /// Derivatives access (bitmask: 1=perps, 2=variance, 4=exotic)
    pub derivatives_access: u8,
}

impl Default for TierDefinition {
    fn default() -> Self {
        TierDefinition {
            min_fairscore: 0,
            fee_bps: 50, // 0.5% default
            mev_protection_level: MevProtectionLevel::None,
            allowed_order_types: 1, // Market only
            derivatives_access: 0,  // None
        }
    }
}

/// Global tier configuration account
#[account]
#[derive(InitSpace)]
pub struct TierConfig {
    /// Authority that can update tier configuration
    pub authority: Pubkey,

    /// Solver's encryption public key
    pub solver_pubkey: Pubkey,

    /// Tier definitions (5 tiers: None, Bronze, Silver, Gold, Diamond)
    pub tiers: [TierDefinition; 5],

    /// Fee collection vault
    pub fee_vault: Pubkey,

    /// Total volume processed by each tier (in lamports equivalent)
    pub total_volume_by_tier: [u64; 5],

    /// Total fees collected (in lamports equivalent)
    pub total_fees_collected: u64,

    /// Total orders processed
    pub total_orders: u64,

    /// Whether the protocol is active
    pub is_active: bool,

    /// Bump seed for PDA
    pub bump: u8,
}

impl TierConfig {
    /// Get tier index from FairScore
    pub fn get_tier_index(&self, fairscore: u8) -> usize {
        // Check from highest tier to lowest
        for i in (0..5).rev() {
            if fairscore >= self.tiers[i].min_fairscore {
                return i;
            }
        }
        0 // Default to tier 0 (None)
    }

    /// Get tier definition for a FairScore
    pub fn get_tier(&self, fairscore: u8) -> &TierDefinition {
        let index = self.get_tier_index(fairscore);
        &self.tiers[index]
    }

    /// Get fee in basis points for a FairScore
    pub fn get_fee_bps(&self, fairscore: u8) -> u16 {
        self.get_tier(fairscore).fee_bps
    }

    /// Check if order type is allowed for a FairScore
    pub fn is_order_type_allowed(&self, fairscore: u8, order_type: u8) -> bool {
        let tier = self.get_tier(fairscore);
        (tier.allowed_order_types & order_type) != 0
    }

    /// Get MEV protection level for a FairScore
    pub fn get_mev_protection(&self, fairscore: u8) -> MevProtectionLevel {
        self.get_tier(fairscore).mev_protection_level
    }

    /// Initialize with default tier configuration
    pub fn init_default_tiers(&mut self) {
        // Tier 0: None (FairScore < 20)
        self.tiers[0] = TierDefinition {
            min_fairscore: 0,
            fee_bps: 50, // 0.5%
            mev_protection_level: MevProtectionLevel::None,
            allowed_order_types: 1,  // Market only
            derivatives_access: 0,   // None
        };

        // Tier 1: Bronze (FairScore 20-39)
        self.tiers[1] = TierDefinition {
            min_fairscore: 20,
            fee_bps: 30, // 0.3%
            mev_protection_level: MevProtectionLevel::Basic,
            allowed_order_types: 3,  // Market + Limit
            derivatives_access: 0,   // None
        };

        // Tier 2: Silver (FairScore 40-59)
        self.tiers[2] = TierDefinition {
            min_fairscore: 40,
            fee_bps: 15, // 0.15%
            mev_protection_level: MevProtectionLevel::Full,
            allowed_order_types: 7,  // Market + Limit + TWAP
            derivatives_access: 1,   // Perps only
        };

        // Tier 3: Gold (FairScore 60-79)
        self.tiers[3] = TierDefinition {
            min_fairscore: 60,
            fee_bps: 8, // 0.08%
            mev_protection_level: MevProtectionLevel::Priority,
            allowed_order_types: 15, // Market + Limit + TWAP + Iceberg
            derivatives_access: 3,   // Perps + Variance
        };

        // Tier 4: Diamond (FairScore 80+)
        self.tiers[4] = TierDefinition {
            min_fairscore: 80,
            fee_bps: 5, // 0.05%
            mev_protection_level: MevProtectionLevel::Priority,
            allowed_order_types: 31, // All order types
            derivatives_access: 7,   // All derivatives
        };
    }
}
