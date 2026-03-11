use std::hash::sha256;

/// DarkFlow Position Proof Circuit
///
/// Proves ownership of an encrypted liquidity position without
/// revealing the deposited amount or share percentage.
///
/// Public inputs:
///   - commitment: the position commitment stored on-chain (32 bytes)
///   - owner_hash: SHA-256 of the owner's public key (32 bytes)
///
/// Private inputs:
///   - amount_a: token A deposit amount
///   - amount_b: token B deposit amount
///   - owner_pubkey: the owner's 32-byte public key
///   - randomness: blinding factor used in commitment

fn main(
    // Public inputs
    commitment: pub [u8; 32],
    owner_hash: pub [u8; 32],
    // Private inputs
    amount_a: u64,
    amount_b: u64,
    owner_pubkey: [u8; 32],
    randomness: [u8; 32],
) {
    // 1. Verify the commitment matches the position data
    //    commitment = SHA-256(amount_a_le || amount_b_le || owner_pubkey || randomness)
    let a_bytes = amount_a.to_le_bytes();
    let b_bytes = amount_b.to_le_bytes();

    let mut preimage: [u8; 80] = [0; 80];
    for i in 0..8 {
        preimage[i] = a_bytes[i];
    }
    for i in 0..8 {
        preimage[8 + i] = b_bytes[i];
    }
    for i in 0..32 {
        preimage[16 + i] = owner_pubkey[i];
    }
    for i in 0..32 {
        preimage[48 + i] = randomness[i];
    }
    let computed_commitment = sha256(preimage);
    for i in 0..32 {
        assert(computed_commitment[i] == commitment[i], "Position commitment mismatch");
    }

    // 2. Verify owner identity
    //    owner_hash = SHA-256(owner_pubkey)
    let computed_owner_hash = sha256(owner_pubkey);
    for i in 0..32 {
        assert(computed_owner_hash[i] == owner_hash[i], "Owner hash mismatch");
    }

    // 3. Verify position has value (at least one token deposited)
    assert(amount_a > 0 | amount_b > 0, "Position must have non-zero value");
}
