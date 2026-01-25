use anchor_lang::prelude::*;

#[error_code]
pub enum RwaError {
    #[msg("Protocol is currently paused")]
    ProtocolPaused,

    #[msg("Asset is not active")]
    AssetNotActive,

    #[msg("Asset is frozen")]
    AssetFrozen,

    #[msg("Access grant has expired")]
    AccessExpired,

    #[msg("Access has been revoked")]
    AccessRevoked,

    #[msg("Access has already been revoked")]
    AlreadyRevoked,

    #[msg("Insufficient access level for this operation")]
    InsufficientAccessLevel,

    #[msg("Only the issuer can perform this action")]
    UnauthorizedIssuer,

    #[msg("Only the grantor can revoke this access")]
    UnauthorizedRevoker,

    #[msg("Unauthorized to grant access")]
    UnauthorizedGrantor,

    #[msg("Cannot delegate access without delegation permission")]
    DelegationNotAllowed,

    #[msg("Invalid encrypted metadata length")]
    InvalidMetadataLength,

    #[msg("Invalid key share length")]
    InvalidKeyShareLength,

    #[msg("Invalid encryption public key")]
    InvalidEncryptionKey,

    #[msg("Asset already exists")]
    AssetAlreadyExists,

    #[msg("Access grant already exists")]
    GrantAlreadyExists,

    #[msg("Invalid access grant")]
    InvalidGrant,

    #[msg("Cannot grant access level higher than your own")]
    CannotEscalateAccess,

    #[msg("Invalid expiration time")]
    InvalidExpiration,

    #[msg("Arithmetic overflow")]
    ArithmeticOverflow,
}
