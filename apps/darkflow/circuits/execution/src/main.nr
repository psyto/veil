use std::hash::sha256;

/// DarkFlow Execution Proof Circuit
///
/// Proves that a solver's execution of a dark order is valid:
/// - The solver correctly decrypted the order parameters
/// - The output amount meets the user's minimum
/// - The execution respects the order commitment
///
/// Public inputs:
///   - commitment: the order commitment stored on-chain (32 bytes)
///   - output_amount_hash: SHA-256 of the actual output amount (32 bytes)
///
/// Private inputs:
///   - min_output_amount: user's minimum acceptable output
///   - actual_output_amount: solver's provided output
///   - input_amount: original input amount
///   - randomness: blinding factor used in commitment

fn main(
    // Public inputs
    commitment: pub [u8; 32],
    output_amount_hash: pub [u8; 32],
    // Private inputs
    min_output_amount: u64,
    actual_output_amount: u64,
    input_amount: u64,
    randomness: [u8; 32],
) {
    // 1. Verify output meets minimum (slippage protection)
    assert(
        actual_output_amount >= min_output_amount,
        "Output below minimum (slippage exceeded)"
    );

    // 2. Verify the commitment matches the order parameters
    //    commitment = SHA-256(input_amount_le || min_output_le || randomness)
    let input_bytes = input_amount.to_le_bytes();
    let min_bytes = min_output_amount.to_le_bytes();

    let mut commitment_preimage: [u8; 48] = [0; 48];
    for i in 0..8 {
        commitment_preimage[i] = input_bytes[i];
    }
    for i in 0..8 {
        commitment_preimage[8 + i] = min_bytes[i];
    }
    for i in 0..32 {
        commitment_preimage[16 + i] = randomness[i];
    }
    let computed_commitment = sha256(commitment_preimage);
    for i in 0..32 {
        assert(computed_commitment[i] == commitment[i], "Commitment mismatch");
    }

    // 3. Verify the output amount hash
    let output_bytes = actual_output_amount.to_le_bytes();
    let mut output_preimage: [u8; 8] = [0; 8];
    for i in 0..8 {
        output_preimage[i] = output_bytes[i];
    }
    let computed_output_hash = sha256(output_preimage);
    for i in 0..32 {
        assert(computed_output_hash[i] == output_amount_hash[i], "Output hash mismatch");
    }

    // 4. Verify amounts are positive
    assert(input_amount > 0, "Input amount must be positive");
    assert(actual_output_amount > 0, "Output amount must be positive");
}
