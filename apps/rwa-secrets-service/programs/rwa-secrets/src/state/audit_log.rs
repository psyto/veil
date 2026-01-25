use anchor_lang::prelude::*;

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq, InitSpace)]
pub enum AccessType {
    /// Viewed basic info
    ViewBasic,
    /// Viewed full metadata
    ViewFull,
    /// Performed audit/compliance check
    Audit,
    /// Requested ownership transfer
    TransferRequest,
    /// Downloaded documents
    Download,
}

#[account]
#[derive(InitSpace)]
pub struct AuditLog {
    /// Asset that was accessed
    pub asset: Pubkey,
    /// Who accessed
    pub accessor: Pubkey,
    /// Type of access
    pub access_type: AccessType,
    /// Timestamp of access
    pub timestamp: i64,
    /// Additional metadata about the request (encrypted)
    #[max_len(256)]
    pub request_metadata: Vec<u8>,
    /// Whether access was granted (had valid grant)
    pub was_granted: bool,
    /// PDA bump
    pub bump: u8,
}
