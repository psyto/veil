use anchor_lang::prelude::*;

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq, InitSpace)]
pub enum AssetType {
    RealEstate,
    Securities,
    Commodities,
    Receivables,
    IntellectualProperty,
    Equipment,
    Other,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq, InitSpace)]
pub enum AssetStatus {
    Active,
    Inactive,
    Frozen,
    Transferred,
}

#[account]
#[derive(InitSpace)]
pub struct RwaAsset {
    /// Asset issuer (original creator)
    pub issuer: Pubkey,
    /// Unique asset identifier (hash of off-chain asset ID)
    pub asset_id: [u8; 32],
    /// Type of real world asset
    pub asset_type: AssetType,
    /// Encrypted metadata (contains valuation, ownership, legal docs references)
    /// Encrypted with issuer's key, can be re-encrypted for grantees
    #[max_len(1024)]
    pub encrypted_metadata: Vec<u8>,
    /// Issuer's X25519 public key for encryption
    pub issuer_encryption_pubkey: [u8; 32],
    /// Current status
    pub status: AssetStatus,
    /// Creation timestamp
    pub created_at: i64,
    /// Last update timestamp
    pub updated_at: i64,
    /// Number of active access grants
    pub access_grant_count: u32,
    /// PDA bump
    pub bump: u8,
}

impl RwaAsset {
    pub fn is_active(&self) -> bool {
        self.status == AssetStatus::Active
    }
}
