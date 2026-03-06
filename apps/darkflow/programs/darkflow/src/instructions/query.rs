use anchor_lang::prelude::*;
use crate::{QueryPoolAggregates, PoolAggregates};

/// Query pool aggregates (public data only)
pub fn query_pool_aggregates(ctx: Context<QueryPoolAggregates>) -> Result<PoolAggregates> {
    let pool = &ctx.accounts.pool;

    // Return public aggregates
    // Individual positions remain private
    let aggregates = PoolAggregates {
        tvl_token_a: 0, // Would be fetched from vault
        tvl_token_b: 0, // Would be fetched from vault
        lp_count: pool.position_count,
        volume_24h: pool.total_volume_a + pool.total_volume_b, // Simplified
        utilization_bps: 0, // Would be calculated
        avg_position_commitment: pool.state_commitment,
    };

    msg!("Pool aggregates queried");
    msg!("LP count: {}", aggregates.lp_count);

    Ok(aggregates)
}
