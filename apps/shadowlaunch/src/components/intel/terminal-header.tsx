'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { TrendingUp } from 'lucide-react';

interface TerminalHeaderProps {
  status?: 'ONLINE' | 'SCANNING' | 'OFFLINE' | 'LIVE';
  marketsCount?: number;
  lastScan?: Date | null;
  signalsCount?: number;
}

export function TerminalHeader({
  status = 'ONLINE',
  marketsCount = 0,
  lastScan,
  signalsCount = 0,
}: TerminalHeaderProps) {
  const [cursorVisible, setCursorVisible] = useState(true);

  // Blinking cursor effect
  useEffect(() => {
    const interval = setInterval(() => {
      setCursorVisible((v) => !v);
    }, 500);
    return () => clearInterval(interval);
  }, []);

  const getStatusColor = () => {
    switch (status) {
      case 'ONLINE':
        return 'text-green-500';
      case 'SCANNING':
        return 'text-amber-500';
      case 'LIVE':
        return 'text-red-500';
      case 'OFFLINE':
        return 'text-red-500';
      default:
        return 'text-green-500';
    }
  };

  const formatLastScan = () => {
    if (!lastScan) return 'Never';
    const diff = Date.now() - lastScan.getTime();
    const minutes = Math.floor(diff / 60000);
    if (minutes < 1) return 'Just now';
    if (minutes === 1) return '1m ago';
    return `${minutes}m ago`;
  };

  return (
    <header className="border-b border-green-900/50 bg-[#0a0a0a]/95 backdrop-blur sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 py-3">
        {/* Top bar */}
        <div className="flex items-center justify-between mb-2">
          <Link href="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
            <div className="w-7 h-7 bg-green-500/20 border border-green-500/50 rounded flex items-center justify-center">
              <TrendingUp className="w-4 h-4 text-green-500" />
            </div>
            <span className="text-green-400 font-bold">Kalshify</span>
          </Link>

          <nav className="flex items-center gap-4 text-xs sm:text-sm">
            <Link href="/markets" className="text-green-600 hover:text-green-400 transition-colors">
              Markets
            </Link>
            <Link href="/portfolio" className="text-green-600 hover:text-green-400 transition-colors">
              Portfolio
            </Link>
            <Link href="/leaderboard" className="text-green-600 hover:text-green-400 transition-colors hidden sm:inline">
              Leaderboard
            </Link>
            <Link href="/for-you" className="text-green-600 hover:text-green-400 transition-colors hidden sm:inline">
              AI Picks
            </Link>
            <Link href="/intel" className="text-green-400 font-bold">
              Intel
            </Link>
          </nav>
        </div>

        {/* Terminal title bar */}
        <div className="bg-green-500/10 border border-green-500/30 rounded px-3 py-2">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="text-green-400 text-sm sm:text-base font-bold tracking-wider">
                ▓▓▓ KALSHIFY INTEL TERMINAL v1.0 ▓▓▓
              </span>
              <span className={cursorVisible ? 'opacity-100' : 'opacity-0'}>█</span>
            </div>

            <div className="flex items-center gap-3 text-xs text-green-600">
              <span className="flex items-center gap-1.5">
                <span className={`w-2 h-2 rounded-full ${
                  status === 'ONLINE' ? 'bg-green-500 animate-pulse' :
                  status === 'SCANNING' ? 'bg-amber-500 animate-pulse' :
                  status === 'LIVE' ? 'bg-red-500 animate-pulse' :
                  'bg-red-500'
                }`} />
                <span className={`${getStatusColor()} ${status === 'LIVE' ? 'animate-pulse font-bold' : ''}`}>
                  {status === 'LIVE' ? '● LIVE' : status}
                </span>
              </span>
              <span className="hidden sm:inline text-green-700">|</span>
              <span className="hidden sm:inline">Signals: {signalsCount}</span>
              <span className="text-green-700">|</span>
              <span>Last Scan: {formatLastScan()}</span>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
