use anchor_lang::prelude::*;

#[account]
#[derive(InitSpace)]
pub struct ProtocolConfig {
    /// Protocol admin
    pub admin: Pubkey,
    /// Total registered assets
    pub asset_count: u64,
    /// Whether protocol is paused
    pub is_paused: bool,
    /// PDA bump
    pub bump: u8,
}
