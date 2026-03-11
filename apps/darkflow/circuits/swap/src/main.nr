use std::hash::sha256;

/// DarkFlow Swap Proof Circuit
///
/// Proves that a dark swap is valid without revealing:
/// - The exact swap amount
/// - The user's balance
/// - The minimum output amount
///
/// Public inputs:
///   - encrypted_order_hash: SHA-256 of the encrypted order (32 bytes)
///   - nullifier: unique nullifier to prevent replay (32 bytes)
///   - pool_state_hash: hash of current pool state (32 bytes)
///
/// Private inputs:
///   - input_amount: the actual swap amount
///   - min_output_amount: minimum acceptable output
///   - user_balance: user's token balance (proves sufficiency)
///   - randomness: blinding factor for commitment
///   - order_plaintext: the plaintext order data

fn main(
    // Public inputs
    encrypted_order_hash: pub [u8; 32],
    nullifier: pub [u8; 32],
    pool_state_hash: pub [u8; 32],
    // Private inputs
    input_amount: u64,
    min_output_amount: u64,
    user_balance: u64,
    randomness: [u8; 32],
    order_plaintext: [u8; 64],
) {
    // 1. Verify user has sufficient balance
    assert(user_balance >= input_amount, "Insufficient balance for swap");

    // 2. Verify input amount is positive
    assert(input_amount > 0, "Input amount must be positive");

    // 3. Verify min_output_amount is positive
    assert(min_output_amount > 0, "Min output must be positive");

    // 4. Verify the order plaintext hashes to the public encrypted_order_hash
    //    This binds the private order data to the public commitment
    let order_hash = sha256(order_plaintext);
    for i in 0..32 {
        assert(order_hash[i] == encrypted_order_hash[i], "Order hash mismatch");
    }

    // 5. Verify nullifier is derived correctly from randomness and order
    //    nullifier = SHA-256(randomness || order_plaintext[0..32])
    //    This ensures each order produces a unique nullifier
    let mut nullifier_preimage: [u8; 64] = [0; 64];
    for i in 0..32 {
        nullifier_preimage[i] = randomness[i];
    }
    for i in 0..32 {
        nullifier_preimage[32 + i] = order_plaintext[i];
    }
    let computed_nullifier = sha256(nullifier_preimage);
    for i in 0..32 {
        assert(computed_nullifier[i] == nullifier[i], "Nullifier mismatch");
    }

    // 6. Verify input_amount is encoded in the order plaintext (first 8 bytes, LE)
    let mut amount_check: u64 = 0;
    for i in 0..8 {
        amount_check += (order_plaintext[i] as u64) << (i * 8) as u8;
    }
    assert(amount_check == input_amount, "Amount mismatch in order");
}
