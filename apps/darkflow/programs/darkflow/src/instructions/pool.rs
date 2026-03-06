use anchor_lang::prelude::*;
use crate::{InitializePool, UpdatePoolConfig, DarkPool};
use crate::errors::DarkFlowError;

/// Initialize a new dark liquidity pool
pub fn initialize_pool(
    ctx: Context<InitializePool>,
    token_a_mint: Pubkey,
    token_b_mint: Pubkey,
    pool_encryption_pubkey: [u8; 32],
    fee_rate_bps: u16,
) -> Result<()> {
    // Validate fee rate
    require!(fee_rate_bps <= 10000, DarkFlowError::InvalidAmount);

    // Validate encryption key is not zero
    require!(
        pool_encryption_pubkey != [0u8; 32],
        DarkFlowError::InvalidEncryptionKey
    );

    let pool = &mut ctx.accounts.pool;
    let bump = ctx.bumps.pool;

    pool.authority = ctx.accounts.authority.key();
    pool.token_a_mint = token_a_mint;
    pool.token_b_mint = token_b_mint;
    pool.encryption_pubkey = pool_encryption_pubkey;
    pool.fee_rate_bps = fee_rate_bps;
    pool.position_count = 0;
    pool.order_count = 0;
    pool.total_volume_a = 0;
    pool.total_volume_b = 0;
    pool.state_commitment = [0u8; 32];
    pool.last_update = Clock::get()?.unix_timestamp;
    pool.is_active = true;
    pool.bump = bump;

    msg!("DarkFlow pool initialized");
    msg!("Token A: {}", token_a_mint);
    msg!("Token B: {}", token_b_mint);
    msg!("Fee rate: {} bps", fee_rate_bps);

    Ok(())
}

/// Update pool configuration
pub fn update_pool_config(
    ctx: Context<UpdatePoolConfig>,
    new_fee_rate_bps: Option<u16>,
    new_encryption_pubkey: Option<[u8; 32]>,
) -> Result<()> {
    let pool = &mut ctx.accounts.pool;

    if let Some(fee_rate) = new_fee_rate_bps {
        require!(fee_rate <= 10000, DarkFlowError::InvalidAmount);
        pool.fee_rate_bps = fee_rate;
        msg!("Updated fee rate to {} bps", fee_rate);
    }

    if let Some(encryption_pubkey) = new_encryption_pubkey {
        require!(
            encryption_pubkey != [0u8; 32],
            DarkFlowError::InvalidEncryptionKey
        );
        pool.encryption_pubkey = encryption_pubkey;
        msg!("Updated encryption public key");
    }

    pool.last_update = Clock::get()?.unix_timestamp;

    Ok(())
}
