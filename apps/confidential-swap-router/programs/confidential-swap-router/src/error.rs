use anchor_lang::prelude::*;

#[error_code]
pub enum SwapError {
    #[msg("Order is not in a cancellable state")]
    OrderNotCancellable,

    #[msg("Order is not in an executable state")]
    OrderNotExecutable,

    #[msg("Order is not in a claimable state")]
    OrderNotClaimable,

    #[msg("Unauthorized: only the order owner can perform this action")]
    UnauthorizedOwner,

    #[msg("Unauthorized: only the solver can perform this action")]
    UnauthorizedSolver,

    #[msg("Invalid encrypted payload length")]
    InvalidPayloadLength,

    #[msg("Output amount is below minimum specified")]
    SlippageExceeded,

    #[msg("Order has expired")]
    OrderExpired,

    #[msg("Solver is not active")]
    SolverNotActive,

    #[msg("Invalid input amount")]
    InvalidInputAmount,

    #[msg("Invalid token mint")]
    InvalidTokenMint,

    #[msg("Arithmetic overflow")]
    ArithmeticOverflow,

    #[msg("Order already claimed")]
    AlreadyClaimed,
}
