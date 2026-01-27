use anchor_lang::prelude::*;

/// Confidential token launch status
#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq, InitSpace)]
pub enum LaunchStatus {
    /// Launch is active and accepting purchases
    Active,
    /// Launch has sold out
    SoldOut,
    /// Launch was cancelled
    Cancelled,
    /// Launch has ended
    Ended,
}

/// Confidential token launch with private bonding curve
///
/// Buyers cannot see how much others have purchased,
/// preventing front-running of token launches.
#[account]
#[derive(InitSpace)]
pub struct ConfidentialLaunch {
    /// Launch creator
    pub creator: Pubkey,

    /// Token being launched
    pub token_mint: Pubkey,

    /// Payment token (e.g., SOL, USDC)
    pub payment_mint: Pubkey,

    /// Encrypted bonding curve parameters
    /// Contains: curve_type, a, b, c coefficients
    #[max_len(256)]
    pub encrypted_curve_params: Vec<u8>,

    /// Initial price per token (in payment token)
    pub initial_price: u64,

    /// Maximum supply available for sale
    pub max_supply: u64,

    /// Current supply sold (encrypted aggregate)
    /// Only the creator can decrypt the exact amount
    #[max_len(64)]
    pub encrypted_sold: Vec<u8>,

    /// Public sold count (rounded/approximate for UI)
    pub approximate_sold: u64,

    /// Number of unique buyers (public)
    pub buyer_count: u64,

    /// Total payment received (public aggregate)
    pub total_payments: u64,

    /// Launch status
    pub status: LaunchStatus,

    /// Launch start timestamp
    pub start_time: i64,

    /// Launch end timestamp (0 = no end)
    pub end_time: i64,

    /// Commitment to current state
    pub state_commitment: [u8; 32],

    /// Creation timestamp
    pub created_at: i64,

    /// Bump seed
    pub bump: u8,
}

impl ConfidentialLaunch {
    /// Check if launch is active
    pub fn is_active(&self) -> bool {
        if self.status != LaunchStatus::Active {
            return false;
        }

        let now = Clock::get().unwrap().unix_timestamp;

        // Check if started
        if now < self.start_time {
            return false;
        }

        // Check if ended
        if self.end_time > 0 && now > self.end_time {
            return false;
        }

        true
    }

    /// Record a purchase
    pub fn record_purchase(&mut self, payment_amount: u64, encrypted_sold_update: Vec<u8>) {
        self.total_payments = self.total_payments.saturating_add(payment_amount);
        self.buyer_count = self.buyer_count.saturating_add(1);
        self.encrypted_sold = encrypted_sold_update;

        // Update approximate sold (for UI display)
        // This is intentionally imprecise to protect buyer privacy
        self.approximate_sold = self.approximate_sold.saturating_add(
            payment_amount / self.initial_price
        );
    }

    /// End the launch
    pub fn end(&mut self) {
        self.status = LaunchStatus::Ended;
    }

    /// Mark as sold out
    pub fn mark_sold_out(&mut self) {
        self.status = LaunchStatus::SoldOut;
    }

    /// Cancel the launch
    pub fn cancel(&mut self) {
        self.status = LaunchStatus::Cancelled;
    }
}

/// Encrypted purchase record
#[account]
#[derive(InitSpace)]
pub struct ConfidentialPurchase {
    /// Buyer
    pub buyer: Pubkey,

    /// Launch this purchase belongs to
    pub launch: Pubkey,

    /// Encrypted purchase amount
    #[max_len(128)]
    pub encrypted_amount: Vec<u8>,

    /// Commitment to purchase
    pub commitment: [u8; 32],

    /// Payment amount (public)
    pub payment_amount: u64,

    /// Purchase timestamp
    pub purchased_at: i64,

    /// Whether tokens have been claimed
    pub claimed: bool,

    /// Bump seed
    pub bump: u8,
}
