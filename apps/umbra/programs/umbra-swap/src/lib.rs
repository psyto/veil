use anchor_lang::prelude::*;
use anchor_spl::token::{self, Token, TokenAccount, Transfer, CloseAccount, Mint};

pub mod constants;
pub mod error;
pub mod state;
pub mod sovereign;

use constants::*;
use error::UmbraError;
use state::*;
use sovereign::*;

declare_id!("CqcA7CXYLLGcGCSTYPbN8iKruXJu38kZNciH86CVhewr");

#[program]
pub mod umbra_swap {
    use super::*;

    /// Initialize the tier configuration
    pub fn initialize(
        ctx: Context<Initialize>,
        solver_pubkey: Pubkey,
    ) -> Result<()> {
        let tier_config = &mut ctx.accounts.tier_config;
        tier_config.authority = ctx.accounts.authority.key();
        tier_config.solver_pubkey = solver_pubkey;
        tier_config.fee_vault = ctx.accounts.fee_vault.key();
        tier_config.total_volume_by_tier = [0; 5];
        tier_config.total_fees_collected = 0;
        tier_config.total_orders = 0;
        tier_config.is_active = true;
        tier_config.bump = ctx.bumps.tier_config;

        // Initialize default tier configuration
        tier_config.init_default_tiers();

        msg!("Umbra initialized with solver: {}", solver_pubkey);
        Ok(())
    }

    /// Update tier configuration (admin only)
    pub fn update_tier(
        ctx: Context<UpdateTier>,
        tier_index: u8,
        min_fairscore: u8,
        fee_bps: u16,
        mev_protection_level: u8,
        allowed_order_types: u8,
        derivatives_access: u8,
    ) -> Result<()> {
        require!(tier_index < NUM_TIERS as u8, UmbraError::InvalidTierConfig);
        require!(min_fairscore <= MAX_FAIRSCORE, UmbraError::InvalidFairScore);
        require!(fee_bps <= MAX_FEE_BPS, UmbraError::InvalidTierConfig);

        let tier_config = &mut ctx.accounts.tier_config;
        let tier = &mut tier_config.tiers[tier_index as usize];

        tier.min_fairscore = min_fairscore;
        tier.fee_bps = fee_bps;
        tier.mev_protection_level = match mev_protection_level {
            0 => MevProtectionLevel::None,
            1 => MevProtectionLevel::Basic,
            2 => MevProtectionLevel::Full,
            _ => MevProtectionLevel::Priority,
        };
        tier.allowed_order_types = allowed_order_types;
        tier.derivatives_access = derivatives_access;

        msg!("Updated tier {} configuration", tier_index);
        Ok(())
    }

    /// Submit a tiered order with FairScore verification
    pub fn submit_order(
        ctx: Context<SubmitOrder>,
        order_id: u64,
        input_amount: u64,
        order_type: u8,
        encrypted_payload: Vec<u8>,
        user_encryption_pubkey: Vec<u8>,
        fairscore: u8,
        fairscore_timestamp: i64,
        _fairscore_signature: [u8; 64],
    ) -> Result<()> {
        // Validate inputs
        require!(
            encrypted_payload.len() >= MIN_PAYLOAD_SIZE && encrypted_payload.len() <= MAX_PAYLOAD_SIZE,
            UmbraError::InvalidPayloadLength
        );
        require!(input_amount > 0, UmbraError::InvalidInputAmount);
        require!(fairscore <= MAX_FAIRSCORE, UmbraError::InvalidFairScore);

        let tier_config = &ctx.accounts.tier_config;
        require!(tier_config.is_active, UmbraError::ProtocolPaused);

        // Verify FairScore proof is not too old
        let clock = Clock::get()?;
        let proof_age = clock.unix_timestamp - fairscore_timestamp;
        require!(proof_age <= MAX_PROOF_AGE_SECONDS, UmbraError::FairScoreProofExpired);

        // TODO: In production, verify the FairScore signature here
        // For hackathon, we trust the client-provided score

        // Get tier and validate order type
        let tier_index = tier_config.get_tier_index(fairscore);
        let tier = &tier_config.tiers[tier_index];

        // Convert order_type u8 to OrderType enum and validate
        let order_type_enum = match order_type {
            1 => OrderType::Market,
            2 => OrderType::Limit,
            4 => OrderType::Twap,
            8 => OrderType::Iceberg,
            16 => OrderType::Dark,
            _ => return Err(UmbraError::OrderTypeNotAllowed.into()),
        };

        require!(
            (tier.allowed_order_types & order_type) != 0,
            UmbraError::OrderTypeNotAllowed
        );

        // Transfer input tokens to vault
        let transfer_ctx = CpiContext::new(
            ctx.accounts.token_program.to_account_info(),
            Transfer {
                from: ctx.accounts.user_input_token.to_account_info(),
                to: ctx.accounts.order_vault.to_account_info(),
                authority: ctx.accounts.owner.to_account_info(),
            },
        );
        token::transfer(transfer_ctx, input_amount)?;

        // Initialize order with tier information
        let order = &mut ctx.accounts.order;
        order.owner = ctx.accounts.owner.key();
        order.order_id = order_id;
        order.input_mint = ctx.accounts.input_mint.key();
        order.output_mint = ctx.accounts.output_mint.key();
        order.input_amount = input_amount;
        order.min_output_amount = 0;
        order.output_amount = 0;
        order.encrypted_payload = encrypted_payload;
        order.status = OrderStatus::Pending;
        order.order_type = order_type_enum;
        order.created_at = clock.unix_timestamp;
        order.executed_at = 0;
        order.executed_by = None;

        // Set tier-specific fields
        order.user_tier = tier_index as u8;
        order.fee_bps_applied = tier.fee_bps;
        order.fee_amount = 0; // Calculated at execution
        order.mev_protection_level = tier.mev_protection_level;
        order.fairscore_at_creation = fairscore;
        order.user_encryption_pubkey = user_encryption_pubkey;
        order.bump = ctx.bumps.order;

        msg!(
            "Order {} submitted: tier={}, fee_bps={}, mev_protection={:?}",
            order_id,
            order.get_tier_name(),
            order.fee_bps_applied,
            order.mev_protection_level
        );

        Ok(())
    }

    /// Execute a tiered order (solver only)
    pub fn execute_order(
        ctx: Context<ExecuteOrder>,
        decrypted_min_output: u64,
        actual_output_amount: u64,
    ) -> Result<()> {
        // Validate slippage
        require!(actual_output_amount >= decrypted_min_output, UmbraError::SlippageExceeded);

        let order = &ctx.accounts.order;

        // Calculate fee
        let fee_amount = (actual_output_amount as u128 * order.fee_bps_applied as u128 / 10000) as u64;
        let user_output_amount = actual_output_amount.checked_sub(fee_amount)
            .ok_or(UmbraError::ArithmeticOverflow)?;

        let order_seeds = &[
            ORDER_SEED,
            order.owner.as_ref(),
            &order.order_id.to_le_bytes(),
            &[order.bump],
        ];
        let signer_seeds = &[&order_seeds[..]];

        // Transfer input to solver
        let transfer_to_solver = CpiContext::new_with_signer(
            ctx.accounts.token_program.to_account_info(),
            Transfer {
                from: ctx.accounts.order_vault.to_account_info(),
                to: ctx.accounts.solver_input_token.to_account_info(),
                authority: ctx.accounts.order.to_account_info(),
            },
            signer_seeds,
        );
        token::transfer(transfer_to_solver, ctx.accounts.order.input_amount)?;

        // Transfer output (minus fee) to output vault for user
        let transfer_to_user_vault = CpiContext::new(
            ctx.accounts.token_program.to_account_info(),
            Transfer {
                from: ctx.accounts.solver_output_token.to_account_info(),
                to: ctx.accounts.output_vault.to_account_info(),
                authority: ctx.accounts.solver.to_account_info(),
            },
        );
        token::transfer(transfer_to_user_vault, user_output_amount)?;

        // Transfer fee to fee vault
        if fee_amount > 0 {
            let transfer_fee = CpiContext::new(
                ctx.accounts.token_program.to_account_info(),
                Transfer {
                    from: ctx.accounts.solver_output_token.to_account_info(),
                    to: ctx.accounts.fee_vault.to_account_info(),
                    authority: ctx.accounts.solver.to_account_info(),
                },
            );
            token::transfer(transfer_fee, fee_amount)?;
        }

        // Update order
        let order = &mut ctx.accounts.order;
        order.status = OrderStatus::Completed;
        order.min_output_amount = decrypted_min_output;
        order.output_amount = user_output_amount;
        order.fee_amount = fee_amount;
        order.executed_at = Clock::get()?.unix_timestamp;
        order.executed_by = Some(ctx.accounts.solver.key());

        // Update tier config stats
        let tier_config = &mut ctx.accounts.tier_config;
        tier_config.total_orders = tier_config.total_orders.checked_add(1)
            .ok_or(UmbraError::ArithmeticOverflow)?;
        tier_config.total_volume_by_tier[order.user_tier as usize] =
            tier_config.total_volume_by_tier[order.user_tier as usize]
                .checked_add(order.input_amount)
                .ok_or(UmbraError::ArithmeticOverflow)?;
        tier_config.total_fees_collected = tier_config.total_fees_collected
            .checked_add(fee_amount)
            .ok_or(UmbraError::ArithmeticOverflow)?;

        msg!(
            "Order {} executed: output={}, fee={} ({}bps), tier={}",
            order.order_id,
            user_output_amount,
            fee_amount,
            order.fee_bps_applied,
            order.get_tier_name()
        );

        Ok(())
    }

    /// Cancel an order (owner only)
    pub fn cancel_order(ctx: Context<CancelOrder>) -> Result<()> {
        let order = &ctx.accounts.order;
        let order_seeds = &[
            ORDER_SEED,
            order.owner.as_ref(),
            &order.order_id.to_le_bytes(),
            &[order.bump],
        ];
        let signer_seeds = &[&order_seeds[..]];

        // Return input tokens to user
        let vault_balance = ctx.accounts.order_vault.amount;
        if vault_balance > 0 {
            let transfer_ctx = CpiContext::new_with_signer(
                ctx.accounts.token_program.to_account_info(),
                Transfer {
                    from: ctx.accounts.order_vault.to_account_info(),
                    to: ctx.accounts.user_input_token.to_account_info(),
                    authority: ctx.accounts.order.to_account_info(),
                },
                signer_seeds,
            );
            token::transfer(transfer_ctx, vault_balance)?;
        }

        // Close vault
        let close_ctx = CpiContext::new_with_signer(
            ctx.accounts.token_program.to_account_info(),
            CloseAccount {
                account: ctx.accounts.order_vault.to_account_info(),
                destination: ctx.accounts.owner.to_account_info(),
                authority: ctx.accounts.order.to_account_info(),
            },
            signer_seeds,
        );
        token::close_account(close_ctx)?;

        let order = &mut ctx.accounts.order;
        order.status = OrderStatus::Cancelled;

        msg!("Order {} cancelled", order.order_id);
        Ok(())
    }

    /// Claim output after execution (owner only)
    pub fn claim_output(ctx: Context<ClaimOutput>) -> Result<()> {
        let order = &ctx.accounts.order;
        let vault_balance = ctx.accounts.output_vault.amount;
        require!(vault_balance > 0, UmbraError::AlreadyClaimed);

        let order_seeds = &[
            ORDER_SEED,
            order.owner.as_ref(),
            &order.order_id.to_le_bytes(),
            &[order.bump],
        ];
        let signer_seeds = &[&order_seeds[..]];

        // Transfer output to user
        let transfer_ctx = CpiContext::new_with_signer(
            ctx.accounts.token_program.to_account_info(),
            Transfer {
                from: ctx.accounts.output_vault.to_account_info(),
                to: ctx.accounts.user_output_token.to_account_info(),
                authority: ctx.accounts.order.to_account_info(),
            },
            signer_seeds,
        );
        token::transfer(transfer_ctx, vault_balance)?;

        // Close vault
        let close_ctx = CpiContext::new_with_signer(
            ctx.accounts.token_program.to_account_info(),
            CloseAccount {
                account: ctx.accounts.output_vault.to_account_info(),
                destination: ctx.accounts.owner.to_account_info(),
                authority: ctx.accounts.order.to_account_info(),
            },
            signer_seeds,
        );
        token::close_account(close_ctx)?;

        msg!("Order {} claimed: {} tokens", order.order_id, vault_balance);
        Ok(())
    }

    /// Pause/unpause the protocol (admin only)
    pub fn set_active(ctx: Context<SetActive>, is_active: bool) -> Result<()> {
        ctx.accounts.tier_config.is_active = is_active;
        msg!("Protocol active status: {}", is_active);
        Ok(())
    }

    /// Submit a tiered order using SOVEREIGN identity for tier determination
    /// This replaces FairScore with on-chain SOVEREIGN reputation
    pub fn submit_order_with_sovereign(
        ctx: Context<SubmitOrderWithSovereign>,
        order_id: u64,
        input_amount: u64,
        order_type: u8,
        encrypted_payload: Vec<u8>,
        user_encryption_pubkey: Vec<u8>,
    ) -> Result<()> {
        // Validate inputs
        require!(
            encrypted_payload.len() >= MIN_PAYLOAD_SIZE && encrypted_payload.len() <= MAX_PAYLOAD_SIZE,
            UmbraError::InvalidPayloadLength
        );
        require!(input_amount > 0, UmbraError::InvalidInputAmount);

        let tier_config = &ctx.accounts.tier_config;
        require!(tier_config.is_active, UmbraError::ProtocolPaused);

        // Validate SOVEREIGN identity PDA belongs to this user
        require!(
            validate_sovereign_pda(&ctx.accounts.sovereign_identity, &ctx.accounts.owner.key()),
            UmbraError::InvalidSovereignIdentity
        );

        // Read SOVEREIGN tier directly from the identity account
        let sovereign_tier = read_sovereign_tier(&ctx.accounts.sovereign_identity);

        // Convert SOVEREIGN tier (1-5) to Umbra tier index (0-4)
        let tier_index = sovereign_tier_to_umbra_index(sovereign_tier);
        let tier = &tier_config.tiers[tier_index];

        // Get privacy benefits based on SOVEREIGN tier
        let benefits = get_privacy_benefits(sovereign_tier);

        // Validate order size against tier limit
        require!(
            input_amount <= benefits.max_order_size,
            UmbraError::OrderExceedsTierLimit
        );

        // Convert order_type u8 to OrderType enum and validate
        let order_type_enum = match order_type {
            1 => OrderType::Market,
            2 => OrderType::Limit,
            4 => OrderType::Twap,
            8 => OrderType::Iceberg,
            16 => OrderType::Dark,
            _ => return Err(UmbraError::OrderTypeNotAllowed.into()),
        };

        // Dark pool access requires SOVEREIGN tier 4+
        if order_type == 16 && !benefits.dark_pool_access {
            return Err(UmbraError::OrderTypeNotAllowed.into());
        }

        require!(
            (tier.allowed_order_types & order_type) != 0,
            UmbraError::OrderTypeNotAllowed
        );

        // Transfer input tokens to vault
        let transfer_ctx = CpiContext::new(
            ctx.accounts.token_program.to_account_info(),
            Transfer {
                from: ctx.accounts.user_input_token.to_account_info(),
                to: ctx.accounts.order_vault.to_account_info(),
                authority: ctx.accounts.owner.to_account_info(),
            },
        );
        token::transfer(transfer_ctx, input_amount)?;

        let clock = Clock::get()?;

        // Initialize order with tier information
        let order = &mut ctx.accounts.order;
        order.owner = ctx.accounts.owner.key();
        order.order_id = order_id;
        order.input_mint = ctx.accounts.input_mint.key();
        order.output_mint = ctx.accounts.output_mint.key();
        order.input_amount = input_amount;
        order.min_output_amount = 0;
        order.output_amount = 0;
        order.encrypted_payload = encrypted_payload;
        order.status = OrderStatus::Pending;
        order.order_type = order_type_enum;
        order.created_at = clock.unix_timestamp;
        order.executed_at = 0;
        order.executed_by = None;

        // Apply SOVEREIGN tier benefits
        // Calculate fee with potential discount from SOVEREIGN tier
        let base_fee_bps = tier.fee_bps;
        let discounted_fee_bps = base_fee_bps
            .saturating_sub(benefits.fee_discount_bps.min(base_fee_bps));

        // Set tier-specific fields
        order.user_tier = tier_index as u8;
        order.fee_bps_applied = discounted_fee_bps;
        order.fee_amount = 0; // Calculated at execution
        order.mev_protection_level = if benefits.priority_execution {
            MevProtectionLevel::Priority
        } else {
            tier.mev_protection_level
        };
        // Store SOVEREIGN tier as fairscore equivalent for backward compatibility
        order.fairscore_at_creation = sovereign_tier_to_fairscore(sovereign_tier);
        order.user_encryption_pubkey = user_encryption_pubkey;
        order.bump = ctx.bumps.order;

        msg!(
            "SOVEREIGN Order {} submitted: sovereign_tier={}, umbra_tier={}, fee_bps={} (discount={}bps), mev_protection={:?}",
            order_id,
            sovereign_tier,
            order.get_tier_name(),
            order.fee_bps_applied,
            benefits.fee_discount_bps,
            order.mev_protection_level
        );

        Ok(())
    }
}

// ============ Account Contexts ============

#[derive(Accounts)]
pub struct Initialize<'info> {
    #[account(mut)]
    pub authority: Signer<'info>,

    #[account(
        init,
        payer = authority,
        space = 8 + TierConfig::INIT_SPACE,
        seeds = [TIER_CONFIG_SEED],
        bump
    )]
    pub tier_config: Account<'info, TierConfig>,

    /// Fee collection vault (any token account controlled by authority)
    /// CHECK: Validated by constraint
    pub fee_vault: AccountInfo<'info>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct UpdateTier<'info> {
    #[account(mut)]
    pub authority: Signer<'info>,

    #[account(
        mut,
        seeds = [TIER_CONFIG_SEED],
        bump = tier_config.bump,
        constraint = tier_config.authority == authority.key() @ UmbraError::UnauthorizedOwner
    )]
    pub tier_config: Account<'info, TierConfig>,
}

#[derive(Accounts)]
#[instruction(order_id: u64)]
pub struct SubmitOrder<'info> {
    #[account(mut)]
    pub owner: Signer<'info>,

    #[account(
        seeds = [TIER_CONFIG_SEED],
        bump = tier_config.bump,
        constraint = tier_config.is_active @ UmbraError::ProtocolPaused
    )]
    pub tier_config: Box<Account<'info, TierConfig>>,

    #[account(
        init,
        payer = owner,
        space = 8 + TieredOrder::INIT_SPACE,
        seeds = [ORDER_SEED, owner.key().as_ref(), &order_id.to_le_bytes()],
        bump
    )]
    pub order: Box<Account<'info, TieredOrder>>,

    pub input_mint: Box<Account<'info, Mint>>,
    pub output_mint: Box<Account<'info, Mint>>,

    #[account(
        mut,
        constraint = user_input_token.mint == input_mint.key() @ UmbraError::InvalidTokenMint,
        constraint = user_input_token.owner == owner.key() @ UmbraError::UnauthorizedOwner
    )]
    pub user_input_token: Box<Account<'info, TokenAccount>>,

    #[account(
        init,
        payer = owner,
        seeds = [ORDER_VAULT_SEED, order.key().as_ref()],
        bump,
        token::mint = input_mint,
        token::authority = order
    )]
    pub order_vault: Box<Account<'info, TokenAccount>>,

    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct ExecuteOrder<'info> {
    #[account(mut)]
    pub solver: Signer<'info>,

    #[account(
        mut,
        seeds = [TIER_CONFIG_SEED],
        bump = tier_config.bump,
        constraint = tier_config.is_active @ UmbraError::ProtocolPaused,
        constraint = tier_config.solver_pubkey == solver.key() @ UmbraError::UnauthorizedSolver
    )]
    pub tier_config: Box<Account<'info, TierConfig>>,

    #[account(
        mut,
        seeds = [ORDER_SEED, order.owner.as_ref(), &order.order_id.to_le_bytes()],
        bump = order.bump,
        constraint = order.is_executable() @ UmbraError::OrderNotExecutable
    )]
    pub order: Box<Account<'info, TieredOrder>>,

    pub input_mint: Box<Account<'info, Mint>>,
    pub output_mint: Box<Account<'info, Mint>>,

    #[account(
        mut,
        seeds = [ORDER_VAULT_SEED, order.key().as_ref()],
        bump,
        constraint = order_vault.mint == input_mint.key() @ UmbraError::InvalidTokenMint
    )]
    pub order_vault: Box<Account<'info, TokenAccount>>,

    #[account(
        init,
        payer = solver,
        seeds = [OUTPUT_VAULT_SEED, order.key().as_ref()],
        bump,
        token::mint = output_mint,
        token::authority = order
    )]
    pub output_vault: Box<Account<'info, TokenAccount>>,

    #[account(
        mut,
        constraint = solver_input_token.mint == input_mint.key() @ UmbraError::InvalidTokenMint,
        constraint = solver_input_token.owner == solver.key() @ UmbraError::UnauthorizedSolver
    )]
    pub solver_input_token: Box<Account<'info, TokenAccount>>,

    #[account(
        mut,
        constraint = solver_output_token.mint == output_mint.key() @ UmbraError::InvalidTokenMint,
        constraint = solver_output_token.owner == solver.key() @ UmbraError::UnauthorizedSolver
    )]
    pub solver_output_token: Box<Account<'info, TokenAccount>>,

    #[account(
        mut,
        constraint = fee_vault.mint == output_mint.key() @ UmbraError::InvalidTokenMint
    )]
    pub fee_vault: Box<Account<'info, TokenAccount>>,

    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct CancelOrder<'info> {
    #[account(mut)]
    pub owner: Signer<'info>,

    #[account(
        mut,
        seeds = [ORDER_SEED, owner.key().as_ref(), &order.order_id.to_le_bytes()],
        bump = order.bump,
        constraint = order.owner == owner.key() @ UmbraError::UnauthorizedOwner,
        constraint = order.is_cancellable() @ UmbraError::OrderNotCancellable
    )]
    pub order: Box<Account<'info, TieredOrder>>,

    pub input_mint: Box<Account<'info, Mint>>,

    #[account(
        mut,
        seeds = [ORDER_VAULT_SEED, order.key().as_ref()],
        bump,
        constraint = order_vault.mint == input_mint.key() @ UmbraError::InvalidTokenMint
    )]
    pub order_vault: Box<Account<'info, TokenAccount>>,

    #[account(
        mut,
        constraint = user_input_token.mint == input_mint.key() @ UmbraError::InvalidTokenMint,
        constraint = user_input_token.owner == owner.key() @ UmbraError::UnauthorizedOwner
    )]
    pub user_input_token: Box<Account<'info, TokenAccount>>,

    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct ClaimOutput<'info> {
    #[account(mut)]
    pub owner: Signer<'info>,

    #[account(
        mut,
        seeds = [ORDER_SEED, owner.key().as_ref(), &order.order_id.to_le_bytes()],
        bump = order.bump,
        constraint = order.owner == owner.key() @ UmbraError::UnauthorizedOwner,
        constraint = order.is_claimable() @ UmbraError::OrderNotClaimable
    )]
    pub order: Box<Account<'info, TieredOrder>>,

    pub output_mint: Box<Account<'info, Mint>>,

    #[account(
        mut,
        seeds = [OUTPUT_VAULT_SEED, order.key().as_ref()],
        bump,
        constraint = output_vault.mint == output_mint.key() @ UmbraError::InvalidTokenMint
    )]
    pub output_vault: Box<Account<'info, TokenAccount>>,

    #[account(
        mut,
        constraint = user_output_token.mint == output_mint.key() @ UmbraError::InvalidTokenMint,
        constraint = user_output_token.owner == owner.key() @ UmbraError::UnauthorizedOwner
    )]
    pub user_output_token: Box<Account<'info, TokenAccount>>,

    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct SetActive<'info> {
    #[account(mut)]
    pub authority: Signer<'info>,

    #[account(
        mut,
        seeds = [TIER_CONFIG_SEED],
        bump = tier_config.bump,
        constraint = tier_config.authority == authority.key() @ UmbraError::UnauthorizedOwner
    )]
    pub tier_config: Account<'info, TierConfig>,
}

/// Submit order using SOVEREIGN identity instead of FairScore
#[derive(Accounts)]
#[instruction(order_id: u64)]
pub struct SubmitOrderWithSovereign<'info> {
    #[account(mut)]
    pub owner: Signer<'info>,

    #[account(
        seeds = [TIER_CONFIG_SEED],
        bump = tier_config.bump,
        constraint = tier_config.is_active @ UmbraError::ProtocolPaused
    )]
    pub tier_config: Box<Account<'info, TierConfig>>,

    /// The user's SOVEREIGN identity account
    /// CHECK: Validated by PDA derivation in instruction logic
    #[account(
        seeds = [b"identity", owner.key().as_ref()],
        seeds::program = SOVEREIGN_PROGRAM_ID,
        bump,
    )]
    pub sovereign_identity: AccountInfo<'info>,

    #[account(
        init,
        payer = owner,
        space = 8 + TieredOrder::INIT_SPACE,
        seeds = [ORDER_SEED, owner.key().as_ref(), &order_id.to_le_bytes()],
        bump
    )]
    pub order: Box<Account<'info, TieredOrder>>,

    pub input_mint: Box<Account<'info, Mint>>,
    pub output_mint: Box<Account<'info, Mint>>,

    #[account(
        mut,
        constraint = user_input_token.mint == input_mint.key() @ UmbraError::InvalidTokenMint,
        constraint = user_input_token.owner == owner.key() @ UmbraError::UnauthorizedOwner
    )]
    pub user_input_token: Box<Account<'info, TokenAccount>>,

    #[account(
        init,
        payer = owner,
        seeds = [ORDER_VAULT_SEED, order.key().as_ref()],
        bump,
        token::mint = input_mint,
        token::authority = order
    )]
    pub order_vault: Box<Account<'info, TokenAccount>>,

    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
}
