use anchor_lang::prelude::*;
use anchor_spl::token::{self, Token, TokenAccount, Transfer, CloseAccount, Mint};

pub mod constants;
pub mod error;
pub mod state;

use constants::*;
use error::SwapError;
use state::*;

declare_id!("v7th9XoyXeonxKLPsKdcgaNsSMLR44HDY7hadD7CCRM");

#[program]
pub mod confidential_swap_router {
    use super::*;

    pub fn initialize_solver(
        ctx: Context<InitializeSolver>,
        solver_pubkey: Pubkey,
        fee_bps: u16,
    ) -> Result<()> {
        require!(fee_bps <= MAX_FEE_BPS, SwapError::InvalidInputAmount);

        let solver_config = &mut ctx.accounts.solver_config;
        solver_config.authority = ctx.accounts.authority.key();
        solver_config.solver_pubkey = solver_pubkey;
        solver_config.fee_bps = fee_bps;
        solver_config.total_orders = 0;
        solver_config.total_volume = 0;
        solver_config.is_active = true;
        solver_config.bump = ctx.bumps.solver_config;

        msg!("Solver initialized with pubkey: {}", solver_pubkey);
        Ok(())
    }

    pub fn submit_order(
        ctx: Context<SubmitOrder>,
        order_id: u64,
        input_amount: u64,
        encrypted_payload: Vec<u8>,
    ) -> Result<()> {
        require!(
            encrypted_payload.len() >= MIN_PAYLOAD_SIZE && encrypted_payload.len() <= MAX_PAYLOAD_SIZE,
            SwapError::InvalidPayloadLength
        );
        require!(input_amount > 0, SwapError::InvalidInputAmount);

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

        // Initialize order
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
        order.created_at = Clock::get()?.unix_timestamp;
        order.executed_at = 0;
        order.executed_by = None;
        order.execution_signature = Vec::new();
        order.bump = ctx.bumps.order;

        msg!("Order {} submitted", order_id);
        Ok(())
    }

    pub fn execute_order(
        ctx: Context<ExecuteOrder>,
        decrypted_min_output: u64,
        actual_output_amount: u64,
    ) -> Result<()> {
        require!(actual_output_amount >= decrypted_min_output, SwapError::SlippageExceeded);

        let order = &ctx.accounts.order;
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

        // Transfer output to vault
        let transfer_to_vault = CpiContext::new(
            ctx.accounts.token_program.to_account_info(),
            Transfer {
                from: ctx.accounts.solver_output_token.to_account_info(),
                to: ctx.accounts.output_vault.to_account_info(),
                authority: ctx.accounts.solver.to_account_info(),
            },
        );
        token::transfer(transfer_to_vault, actual_output_amount)?;

        // Update order
        let order = &mut ctx.accounts.order;
        order.status = OrderStatus::Completed;
        order.min_output_amount = decrypted_min_output;
        order.output_amount = actual_output_amount;
        order.executed_at = Clock::get()?.unix_timestamp;
        order.executed_by = Some(ctx.accounts.solver.key());

        // Update stats
        let solver_config = &mut ctx.accounts.solver_config;
        solver_config.total_orders = solver_config.total_orders.checked_add(1)
            .ok_or(SwapError::ArithmeticOverflow)?;
        solver_config.total_volume = solver_config.total_volume.checked_add(order.input_amount)
            .ok_or(SwapError::ArithmeticOverflow)?;

        msg!("Order {} executed", order.order_id);
        Ok(())
    }

    pub fn cancel_order(ctx: Context<CancelOrder>) -> Result<()> {
        let order = &ctx.accounts.order;
        let order_seeds = &[
            ORDER_SEED,
            order.owner.as_ref(),
            &order.order_id.to_le_bytes(),
            &[order.bump],
        ];
        let signer_seeds = &[&order_seeds[..]];

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

    pub fn claim_output(ctx: Context<ClaimOutput>) -> Result<()> {
        let order = &ctx.accounts.order;
        let vault_balance = ctx.accounts.output_vault.amount;
        require!(vault_balance > 0, SwapError::AlreadyClaimed);

        let order_seeds = &[
            ORDER_SEED,
            order.owner.as_ref(),
            &order.order_id.to_le_bytes(),
            &[order.bump],
        ];
        let signer_seeds = &[&order_seeds[..]];

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
}

// Account structs
#[derive(Accounts)]
pub struct InitializeSolver<'info> {
    #[account(mut)]
    pub authority: Signer<'info>,
    #[account(
        init,
        payer = authority,
        space = 8 + SolverConfig::INIT_SPACE,
        seeds = [SOLVER_CONFIG_SEED],
        bump
    )]
    pub solver_config: Account<'info, SolverConfig>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
#[instruction(order_id: u64)]
pub struct SubmitOrder<'info> {
    #[account(mut)]
    pub owner: Signer<'info>,
    #[account(seeds = [SOLVER_CONFIG_SEED], bump = solver_config.bump, constraint = solver_config.is_active @ SwapError::SolverNotActive)]
    pub solver_config: Box<Account<'info, SolverConfig>>,
    #[account(init, payer = owner, space = 8 + EncryptedOrder::INIT_SPACE, seeds = [ORDER_SEED, owner.key().as_ref(), &order_id.to_le_bytes()], bump)]
    pub order: Box<Account<'info, EncryptedOrder>>,
    pub input_mint: Box<Account<'info, Mint>>,
    pub output_mint: Box<Account<'info, Mint>>,
    #[account(mut, constraint = user_input_token.mint == input_mint.key() @ SwapError::InvalidTokenMint, constraint = user_input_token.owner == owner.key() @ SwapError::UnauthorizedOwner)]
    pub user_input_token: Box<Account<'info, TokenAccount>>,
    #[account(init, payer = owner, seeds = [ORDER_VAULT_SEED, order.key().as_ref()], bump, token::mint = input_mint, token::authority = order)]
    pub order_vault: Box<Account<'info, TokenAccount>>,
    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct ExecuteOrder<'info> {
    #[account(mut)]
    pub solver: Signer<'info>,
    #[account(mut, seeds = [SOLVER_CONFIG_SEED], bump = solver_config.bump, constraint = solver_config.is_active @ SwapError::SolverNotActive, constraint = solver_config.solver_pubkey == solver.key() @ SwapError::UnauthorizedSolver)]
    pub solver_config: Box<Account<'info, SolverConfig>>,
    #[account(mut, seeds = [ORDER_SEED, order.owner.as_ref(), &order.order_id.to_le_bytes()], bump = order.bump, constraint = order.is_executable() @ SwapError::OrderNotExecutable)]
    pub order: Box<Account<'info, EncryptedOrder>>,
    pub input_mint: Box<Account<'info, Mint>>,
    pub output_mint: Box<Account<'info, Mint>>,
    #[account(mut, seeds = [ORDER_VAULT_SEED, order.key().as_ref()], bump, constraint = order_vault.mint == input_mint.key() @ SwapError::InvalidTokenMint)]
    pub order_vault: Box<Account<'info, TokenAccount>>,
    #[account(init, payer = solver, seeds = [OUTPUT_VAULT_SEED, order.key().as_ref()], bump, token::mint = output_mint, token::authority = order)]
    pub output_vault: Box<Account<'info, TokenAccount>>,
    #[account(mut, constraint = solver_input_token.mint == input_mint.key() @ SwapError::InvalidTokenMint, constraint = solver_input_token.owner == solver.key() @ SwapError::UnauthorizedSolver)]
    pub solver_input_token: Box<Account<'info, TokenAccount>>,
    #[account(mut, constraint = solver_output_token.mint == output_mint.key() @ SwapError::InvalidTokenMint, constraint = solver_output_token.owner == solver.key() @ SwapError::UnauthorizedSolver)]
    pub solver_output_token: Box<Account<'info, TokenAccount>>,
    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct CancelOrder<'info> {
    #[account(mut)]
    pub owner: Signer<'info>,
    #[account(mut, seeds = [ORDER_SEED, owner.key().as_ref(), &order.order_id.to_le_bytes()], bump = order.bump, constraint = order.owner == owner.key() @ SwapError::UnauthorizedOwner, constraint = order.is_cancellable() @ SwapError::OrderNotCancellable)]
    pub order: Box<Account<'info, EncryptedOrder>>,
    pub input_mint: Box<Account<'info, Mint>>,
    #[account(mut, seeds = [ORDER_VAULT_SEED, order.key().as_ref()], bump, constraint = order_vault.mint == input_mint.key() @ SwapError::InvalidTokenMint)]
    pub order_vault: Box<Account<'info, TokenAccount>>,
    #[account(mut, constraint = user_input_token.mint == input_mint.key() @ SwapError::InvalidTokenMint, constraint = user_input_token.owner == owner.key() @ SwapError::UnauthorizedOwner)]
    pub user_input_token: Box<Account<'info, TokenAccount>>,
    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct ClaimOutput<'info> {
    #[account(mut)]
    pub owner: Signer<'info>,
    #[account(mut, seeds = [ORDER_SEED, owner.key().as_ref(), &order.order_id.to_le_bytes()], bump = order.bump, constraint = order.owner == owner.key() @ SwapError::UnauthorizedOwner, constraint = order.is_claimable() @ SwapError::OrderNotClaimable)]
    pub order: Box<Account<'info, EncryptedOrder>>,
    pub output_mint: Box<Account<'info, Mint>>,
    #[account(mut, seeds = [OUTPUT_VAULT_SEED, order.key().as_ref()], bump, constraint = output_vault.mint == output_mint.key() @ SwapError::InvalidTokenMint)]
    pub output_vault: Box<Account<'info, TokenAccount>>,
    #[account(mut, constraint = user_output_token.mint == output_mint.key() @ SwapError::InvalidTokenMint, constraint = user_output_token.owner == owner.key() @ SwapError::UnauthorizedOwner)]
    pub user_output_token: Box<Account<'info, TokenAccount>>,
    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
}
