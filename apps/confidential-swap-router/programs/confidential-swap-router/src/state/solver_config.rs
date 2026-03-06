use anchor_lang::prelude::*;

#[account]
#[derive(InitSpace)]
pub struct SolverConfig {
    /// The authority that can update solver settings
    pub authority: Pubkey,
    /// The solver's public key (for encryption)
    pub solver_pubkey: Pubkey,
    /// Fee in basis points (e.g., 30 = 0.3%)
    pub fee_bps: u16,
    /// Total orders processed
    pub total_orders: u64,
    /// Total volume processed (in lamports equivalent)
    pub total_volume: u64,
    /// Whether the solver is active
    pub is_active: bool,
    /// Bump seed for PDA
    pub bump: u8,
}
