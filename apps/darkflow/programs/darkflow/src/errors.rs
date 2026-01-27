use anchor_lang::prelude::*;

#[error_code]
pub enum DarkFlowError {
    #[msg("Pool is not active")]
    PoolNotActive,

    #[msg("Invalid encryption public key")]
    InvalidEncryptionKey,

    #[msg("Invalid commitment")]
    InvalidCommitment,

    #[msg("Invalid ZK proof")]
    InvalidZkProof,

    #[msg("Nullifier already used")]
    NullifierAlreadyUsed,

    #[msg("Order expired")]
    OrderExpired,

    #[msg("Order not pending")]
    OrderNotPending,

    #[msg("Unauthorized")]
    Unauthorized,

    #[msg("Insufficient balance")]
    InsufficientBalance,

    #[msg("Invalid amount")]
    InvalidAmount,

    #[msg("Slippage exceeded")]
    SlippageExceeded,

    #[msg("Position not found")]
    PositionNotFound,

    #[msg("Position not active")]
    PositionNotActive,

    #[msg("Launch not active")]
    LaunchNotActive,

    #[msg("Launch sold out")]
    LaunchSoldOut,

    #[msg("Invalid proof size")]
    InvalidProofSize,

    #[msg("Invalid encrypted data")]
    InvalidEncryptedData,

    #[msg("Math overflow")]
    MathOverflow,

    #[msg("Invalid token mint")]
    InvalidTokenMint,

    #[msg("Deadline exceeded")]
    DeadlineExceeded,
}
