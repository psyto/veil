'use client';

export function Stats() {
  // Mock stats
  const stats = {
    totalVolume: '$2.4M',
    totalOrders: '12,847',
    mevSaved: '$48,291',
    avgFee: '0.12%',
  };

  const recentOrders = [
    { id: '1', pair: 'SOL/USDC', amount: '$1,234', tier: 'Gold', status: 'completed' },
    { id: '2', pair: 'RAY/USDC', amount: '$567', tier: 'Silver', status: 'completed' },
    { id: '3', pair: 'USDC/SOL', amount: '$2,100', tier: 'Diamond', status: 'pending' },
  ];

  return (
    <div className="space-y-6">
      {/* Protocol Stats */}
      <div className="bg-white/5 rounded-2xl p-6 border border-white/10">
        <h2 className="text-lg font-semibold mb-4">Protocol Stats</h2>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <div className="text-gray-400 text-sm">Total Volume</div>
            <div className="text-xl font-bold">{stats.totalVolume}</div>
          </div>
          <div>
            <div className="text-gray-400 text-sm">Total Orders</div>
            <div className="text-xl font-bold">{stats.totalOrders}</div>
          </div>
          <div>
            <div className="text-gray-400 text-sm">MEV Saved</div>
            <div className="text-xl font-bold text-green-400">{stats.mevSaved}</div>
          </div>
          <div>
            <div className="text-gray-400 text-sm">Avg Fee</div>
            <div className="text-xl font-bold">{stats.avgFee}</div>
          </div>
        </div>
      </div>

      {/* Volume by Tier */}
      <div className="bg-white/5 rounded-2xl p-6 border border-white/10">
        <h2 className="text-lg font-semibold mb-4">Volume by Tier</h2>
        <div className="space-y-3">
          {[
            { name: 'Diamond', percent: 35, color: 'cyan' },
            { name: 'Gold', percent: 30, color: 'yellow' },
            { name: 'Silver', percent: 20, color: 'slate' },
            { name: 'Bronze', percent: 10, color: 'amber' },
            { name: 'None', percent: 5, color: 'gray' },
          ].map((tier) => (
            <div key={tier.name}>
              <div className="flex justify-between text-sm mb-1">
                <span className={`text-${tier.color}-400`}>{tier.name}</span>
                <span className="text-gray-400">{tier.percent}%</span>
              </div>
              <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                <div
                  className={`h-full bg-${tier.color}-500`}
                  style={{ width: `${tier.percent}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Recent Orders */}
      <div className="bg-white/5 rounded-2xl p-6 border border-white/10">
        <h2 className="text-lg font-semibold mb-4">Recent Orders</h2>
        <div className="space-y-3">
          {recentOrders.map((order) => (
            <div
              key={order.id}
              className="flex items-center justify-between p-3 bg-white/5 rounded-lg"
            >
              <div>
                <div className="font-medium">{order.pair}</div>
                <div className="text-sm text-gray-400">{order.amount}</div>
              </div>
              <div className="text-right">
                <div
                  className={`text-sm tier-${order.tier.toLowerCase()} px-2 py-0.5 rounded inline-block`}
                >
                  {order.tier}
                </div>
                <div
                  className={`text-xs mt-1 ${
                    order.status === 'completed'
                      ? 'text-green-400'
                      : 'text-yellow-400'
                  }`}
                >
                  {order.status}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
