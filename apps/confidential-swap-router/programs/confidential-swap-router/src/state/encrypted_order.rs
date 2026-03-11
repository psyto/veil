use anchor_lang::prelude::*;

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq, InitSpace)]
pub enum OrderStatus {
    Pending,
    Executing,
    Completed,
    Cancelled,
    Failed,
}

#[account]
#[derive(InitSpace)]
pub struct EncryptedOrder {
    /// Order creator
    pub owner: Pubkey,
    /// Unique order ID
    pub order_id: u64,
    /// Input token mint
    pub input_mint: Pubkey,
    /// Output token mint (can be encrypted, but we store for routing)
    pub output_mint: Pubkey,
    /// Input amount deposited
    pub input_amount: u64,
    /// Minimum output amount (encrypted in the payload, stored here after execution)
    pub min_output_amount: u64,
    /// Actual output amount received
    pub output_amount: u64,
    /// Encrypted order payload (contains: exact output mint, min amount, slippage, deadline)
    /// Using NaCl box: 24 byte nonce + variable ciphertext
    /// Max size: 24 (nonce) + 32 (output_mint) + 8 (min_amount) + 8 (slippage) + 8 (deadline) + 16 (auth tag) = 96 bytes
    #[max_len(128)]
    pub encrypted_payload: Vec<u8>,
    /// Order status
    pub status: OrderStatus,
    /// Creation timestamp
    pub created_at: i64,
    /// Execution timestamp (0 if not executed)
    pub executed_at: i64,
    /// Solver that executed this order (if any)
    pub executed_by: Option<Pubkey>,
    /// Transaction signature of execution (for verification)
    #[max_len(88)]
    pub execution_signature: Vec<u8>,
    /// SHA-256 hash of the plaintext order payload (commitment).
    /// User submits this alongside the encrypted payload so the program
    /// can verify the solver's decryption matches the original intent.
    pub payload_hash: [u8; 32],
    /// User's X25519 encryption public key (32 bytes).
    /// Stored on-chain so the solver can decrypt the payload without
    /// needing an off-chain pubkey registry.
    pub user_encryption_pubkey: [u8; 32],
    /// Bump seed for PDA
    pub bump: u8,
}

impl EncryptedOrder {
    pub fn is_cancellable(&self) -> bool {
        self.status == OrderStatus::Pending
    }

    pub fn is_executable(&self) -> bool {
        self.status == OrderStatus::Pending
    }

    pub fn is_claimable(&self) -> bool {
        self.status == OrderStatus::Completed
    }
}
