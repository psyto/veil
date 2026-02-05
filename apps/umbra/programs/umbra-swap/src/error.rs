use anchor_lang::prelude::*;

#[error_code]
pub enum UmbraError {
    #[msg("Invalid input amount")]
    InvalidInputAmount,

    #[msg("Invalid payload length")]
    InvalidPayloadLength,

    #[msg("Solver is not active")]
    SolverNotActive,

    #[msg("Unauthorized solver")]
    UnauthorizedSolver,

    #[msg("Unauthorized owner")]
    UnauthorizedOwner,

    #[msg("Invalid token mint")]
    InvalidTokenMint,

    #[msg("Order is not executable")]
    OrderNotExecutable,

    #[msg("Order is not cancellable")]
    OrderNotCancellable,

    #[msg("Order is not claimable")]
    OrderNotClaimable,

    #[msg("Slippage exceeded")]
    SlippageExceeded,

    #[msg("Output already claimed")]
    AlreadyClaimed,

    #[msg("Arithmetic overflow")]
    ArithmeticOverflow,

    // Tier-specific errors
    #[msg("Invalid FairScore: must be between 0 and 100")]
    InvalidFairScore,

    #[msg("FairScore proof expired")]
    FairScoreProofExpired,

    #[msg("FairScore proof invalid signature")]
    InvalidFairScoreSignature,

    #[msg("Order type not allowed for this tier")]
    OrderTypeNotAllowed,

    #[msg("Insufficient tier for this feature")]
    InsufficientTier,

    #[msg("Derivatives access not allowed for this tier")]
    DerivativesNotAllowed,

    #[msg("Order size exceeds tier limit")]
    OrderSizeExceedsTierLimit,

    #[msg("Invalid tier configuration")]
    InvalidTierConfig,

    #[msg("Fee calculation error")]
    FeeCalculationError,

    #[msg("Protocol is paused")]
    ProtocolPaused,

    #[msg("Invalid fee vault")]
    InvalidFeeVault,
}
