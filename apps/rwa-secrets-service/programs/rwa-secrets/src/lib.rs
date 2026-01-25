use anchor_lang::prelude::*;

pub mod state;
pub mod instructions;
pub mod error;

use state::*;
use error::RwaError;

declare_id!("DWgiBrRNa3JM3XWkPXGXwo7jJ59PvXVr3bVeyKbGySam");

#[program]
pub mod rwa_secrets {
    use super::*;

    /// Initialize the protocol configuration
    pub fn initialize_protocol(
        ctx: Context<InitializeProtocol>,
        admin: Pubkey,
    ) -> Result<()> {
        let config = &mut ctx.accounts.protocol_config;
        config.admin = admin;
        config.asset_count = 0;
        config.is_paused = false;
        config.bump = ctx.bumps.protocol_config;

        msg!("RWA Secrets Protocol initialized");
        Ok(())
    }

    /// Register a new RWA with encrypted metadata
    pub fn register_asset(
        ctx: Context<RegisterAsset>,
        asset_id: [u8; 32],
        asset_type: AssetType,
        encrypted_metadata: Vec<u8>,
        issuer_encryption_pubkey: [u8; 32],
    ) -> Result<()> {
        require!(
            encrypted_metadata.len() >= 64 && encrypted_metadata.len() <= 1024,
            RwaError::InvalidMetadataLength
        );

        let asset = &mut ctx.accounts.asset;
        asset.issuer = ctx.accounts.issuer.key();
        asset.asset_id = asset_id;
        asset.asset_type = asset_type;
        asset.encrypted_metadata = encrypted_metadata;
        asset.issuer_encryption_pubkey = issuer_encryption_pubkey;
        asset.status = AssetStatus::Active;
        asset.created_at = Clock::get()?.unix_timestamp;
        asset.updated_at = Clock::get()?.unix_timestamp;
        asset.access_grant_count = 0;
        asset.bump = ctx.bumps.asset;

        let config = &mut ctx.accounts.protocol_config;
        config.asset_count = config.asset_count.checked_add(1)
            .ok_or(RwaError::ArithmeticOverflow)?;

        msg!("Asset registered: {:?}", asset_id);
        Ok(())
    }

    /// Grant access to encrypted asset data
    pub fn grant_access(
        ctx: Context<GrantAccess>,
        access_level: AccessLevel,
        encrypted_key_share: Vec<u8>,
        expires_at: i64,
        can_delegate: bool,
    ) -> Result<()> {
        require!(
            encrypted_key_share.len() >= 48 && encrypted_key_share.len() <= 256,
            RwaError::InvalidKeyShareLength
        );

        let grant = &mut ctx.accounts.access_grant;
        grant.asset = ctx.accounts.asset.key();
        grant.grantee = ctx.accounts.grantee.key();
        grant.grantor = ctx.accounts.grantor.key();
        grant.access_level = access_level;
        grant.encrypted_key_share = encrypted_key_share;
        grant.granted_at = Clock::get()?.unix_timestamp;
        grant.expires_at = expires_at;
        grant.can_delegate = can_delegate;
        grant.is_revoked = false;
        grant.revoked_at = 0;
        grant.bump = ctx.bumps.access_grant;

        let asset = &mut ctx.accounts.asset;
        asset.access_grant_count = asset.access_grant_count.checked_add(1)
            .ok_or(RwaError::ArithmeticOverflow)?;

        msg!("Access granted to {}", ctx.accounts.grantee.key());
        Ok(())
    }

    /// Revoke access to asset data
    pub fn revoke_access(ctx: Context<RevokeAccess>) -> Result<()> {
        let grant = &mut ctx.accounts.access_grant;
        require!(!grant.is_revoked, RwaError::AlreadyRevoked);

        grant.is_revoked = true;
        grant.revoked_at = Clock::get()?.unix_timestamp;

        msg!("Access revoked for grant {}", ctx.accounts.access_grant.key());
        Ok(())
    }

    /// Log access request for audit trail
    pub fn log_access(
        ctx: Context<LogAccess>,
        access_type: AccessType,
        request_metadata: Vec<u8>,
    ) -> Result<()> {
        let log = &mut ctx.accounts.audit_log;
        log.asset = ctx.accounts.asset.key();
        log.accessor = ctx.accounts.accessor.key();
        log.access_type = access_type;
        log.timestamp = Clock::get()?.unix_timestamp;
        log.request_metadata = request_metadata;
        log.was_granted = ctx.accounts.access_grant.is_some();
        log.bump = ctx.bumps.audit_log;

        msg!("Access logged for asset {}", ctx.accounts.asset.key());
        Ok(())
    }

    /// Update asset metadata (issuer only)
    pub fn update_metadata(
        ctx: Context<UpdateMetadata>,
        new_encrypted_metadata: Vec<u8>,
    ) -> Result<()> {
        require!(
            new_encrypted_metadata.len() >= 64 && new_encrypted_metadata.len() <= 1024,
            RwaError::InvalidMetadataLength
        );

        let asset = &mut ctx.accounts.asset;
        asset.encrypted_metadata = new_encrypted_metadata;
        asset.updated_at = Clock::get()?.unix_timestamp;

        msg!("Asset metadata updated");
        Ok(())
    }

    /// Deactivate an asset (issuer only)
    pub fn deactivate_asset(ctx: Context<DeactivateAsset>) -> Result<()> {
        let asset = &mut ctx.accounts.asset;
        asset.status = AssetStatus::Inactive;
        asset.updated_at = Clock::get()?.unix_timestamp;

        msg!("Asset deactivated");
        Ok(())
    }
}

// ============ Account Contexts ============

#[derive(Accounts)]
pub struct InitializeProtocol<'info> {
    #[account(mut)]
    pub authority: Signer<'info>,
    #[account(
        init,
        payer = authority,
        space = 8 + ProtocolConfig::INIT_SPACE,
        seeds = [b"protocol_config"],
        bump
    )]
    pub protocol_config: Account<'info, ProtocolConfig>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
#[instruction(asset_id: [u8; 32])]
pub struct RegisterAsset<'info> {
    #[account(mut)]
    pub issuer: Signer<'info>,
    #[account(mut, seeds = [b"protocol_config"], bump = protocol_config.bump)]
    pub protocol_config: Account<'info, ProtocolConfig>,
    #[account(
        init,
        payer = issuer,
        space = 8 + RwaAsset::INIT_SPACE,
        seeds = [b"rwa_asset", asset_id.as_ref()],
        bump
    )]
    pub asset: Account<'info, RwaAsset>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct GrantAccess<'info> {
    #[account(mut)]
    pub grantor: Signer<'info>,
    /// CHECK: Grantee can be any valid pubkey
    pub grantee: UncheckedAccount<'info>,
    #[account(
        mut,
        seeds = [b"rwa_asset", asset.asset_id.as_ref()],
        bump = asset.bump,
        constraint = asset.issuer == grantor.key() || is_authorized_grantor(&asset, &grantor.key()) @ RwaError::UnauthorizedGrantor
    )]
    pub asset: Account<'info, RwaAsset>,
    #[account(
        init,
        payer = grantor,
        space = 8 + AccessGrant::INIT_SPACE,
        seeds = [b"access_grant", asset.key().as_ref(), grantee.key().as_ref()],
        bump
    )]
    pub access_grant: Account<'info, AccessGrant>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct RevokeAccess<'info> {
    #[account(mut)]
    pub authority: Signer<'info>,
    #[account(
        seeds = [b"rwa_asset", asset.asset_id.as_ref()],
        bump = asset.bump,
        constraint = asset.issuer == authority.key() @ RwaError::UnauthorizedRevoker
    )]
    pub asset: Account<'info, RwaAsset>,
    #[account(
        mut,
        seeds = [b"access_grant", asset.key().as_ref(), access_grant.grantee.as_ref()],
        bump = access_grant.bump,
        constraint = access_grant.asset == asset.key() @ RwaError::InvalidGrant
    )]
    pub access_grant: Account<'info, AccessGrant>,
}

#[derive(Accounts)]
pub struct LogAccess<'info> {
    #[account(mut)]
    pub accessor: Signer<'info>,
    #[account(
        seeds = [b"rwa_asset", asset.asset_id.as_ref()],
        bump = asset.bump
    )]
    pub asset: Account<'info, RwaAsset>,
    #[account(
        seeds = [b"access_grant", asset.key().as_ref(), accessor.key().as_ref()],
        bump = access_grant.bump
    )]
    pub access_grant: Option<Account<'info, AccessGrant>>,
    #[account(
        init,
        payer = accessor,
        space = 8 + AuditLog::INIT_SPACE,
        seeds = [b"audit_log", asset.key().as_ref(), &Clock::get()?.unix_timestamp.to_le_bytes()],
        bump
    )]
    pub audit_log: Account<'info, AuditLog>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct UpdateMetadata<'info> {
    #[account(mut)]
    pub issuer: Signer<'info>,
    #[account(
        mut,
        seeds = [b"rwa_asset", asset.asset_id.as_ref()],
        bump = asset.bump,
        constraint = asset.issuer == issuer.key() @ RwaError::UnauthorizedIssuer
    )]
    pub asset: Account<'info, RwaAsset>,
}

#[derive(Accounts)]
pub struct DeactivateAsset<'info> {
    #[account(mut)]
    pub issuer: Signer<'info>,
    #[account(
        mut,
        seeds = [b"rwa_asset", asset.asset_id.as_ref()],
        bump = asset.bump,
        constraint = asset.issuer == issuer.key() @ RwaError::UnauthorizedIssuer
    )]
    pub asset: Account<'info, RwaAsset>,
}

// Helper function to check if grantor is authorized to grant access
fn is_authorized_grantor(asset: &RwaAsset, grantor: &Pubkey) -> bool {
    // In production, check if grantor has a valid access grant with can_delegate=true
    asset.issuer == *grantor
}
