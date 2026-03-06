use anchor_lang::prelude::*;

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq, InitSpace)]
pub enum AccessLevel {
    /// Can view basic asset info only
    ViewBasic,
    /// Can view full encrypted metadata
    ViewFull,
    /// Can view and verify compliance
    Auditor,
    /// Full access including ability to transfer
    Admin,
}

#[account]
#[derive(InitSpace)]
pub struct AccessGrant {
    /// The asset this grant is for
    pub asset: Pubkey,
    /// Who has access
    pub grantee: Pubkey,
    /// Who granted access
    pub grantor: Pubkey,
    /// Level of access granted
    pub access_level: AccessLevel,
    /// Encrypted key share for decryption
    /// Re-encrypted from issuer's key to grantee's key
    #[max_len(256)]
    pub encrypted_key_share: Vec<u8>,
    /// When access was granted
    pub granted_at: i64,
    /// When access expires (0 = never)
    pub expires_at: i64,
    /// Whether grantee can delegate access to others
    pub can_delegate: bool,
    /// Whether grant has been revoked
    pub is_revoked: bool,
    /// When grant was revoked (0 = not revoked)
    pub revoked_at: i64,
    /// PDA bump
    pub bump: u8,
}

impl AccessGrant {
    pub fn is_valid(&self, current_time: i64) -> bool {
        !self.is_revoked && (self.expires_at == 0 || self.expires_at > current_time)
    }
}
