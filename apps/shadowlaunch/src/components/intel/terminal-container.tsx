'use client';

import { ReactNode } from 'react';

interface TerminalContainerProps {
  children: ReactNode;
  className?: string;
}

export function TerminalContainer({ children, className = '' }: TerminalContainerProps) {
  return (
    <div className={`min-h-screen bg-[#0a0a0a] text-green-500 font-mono relative overflow-hidden ${className}`}>
      {/* Scanline overlay effect */}
      <div className="pointer-events-none fixed inset-0 z-50">
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 1px, rgba(0, 255, 0, 0.03) 2px, transparent 3px)',
            backgroundSize: '100% 3px',
          }}
        />
      </div>

      {/* CRT screen glow effect */}
      <div
        className="pointer-events-none fixed inset-0 z-40 opacity-20"
        style={{
          background: 'radial-gradient(ellipse at center, rgba(0, 255, 0, 0.1) 0%, transparent 70%)',
        }}
      />

      {/* Content */}
      <div className="relative z-10">
        {children}
      </div>
    </div>
  );
}
