'use client';

import { useState, useEffect } from 'react';

interface ScanAnimationProps {
  isScanning: boolean;
  text?: string;
}

export function ScanAnimation({ isScanning, text = 'SCANNING MARKETS' }: ScanAnimationProps) {
  const [dots, setDots] = useState('');
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (!isScanning) {
      setDots('');
      setProgress(0);
      return;
    }

    // Dots animation
    const dotsInterval = setInterval(() => {
      setDots((d) => (d.length >= 3 ? '' : d + '.'));
    }, 300);

    // Progress animation
    const progressInterval = setInterval(() => {
      setProgress((p) => (p >= 100 ? 0 : p + 5));
    }, 100);

    return () => {
      clearInterval(dotsInterval);
      clearInterval(progressInterval);
    };
  }, [isScanning]);

  if (!isScanning) return null;

  // Create progress bar
  const filledBlocks = Math.floor(progress / 5);
  const emptyBlocks = 20 - filledBlocks;
  const progressBar = '█'.repeat(filledBlocks) + '░'.repeat(emptyBlocks);

  return (
    <div className="bg-green-500/10 border border-green-500/30 rounded px-4 py-3 font-mono">
      <div className="flex items-center gap-3 mb-2">
        <span className="animate-pulse text-green-500">●</span>
        <span className="text-green-400 text-sm">
          {text}{dots}
        </span>
      </div>
      <div className="text-green-500 text-xs">
        [{progressBar}] {progress}%
      </div>
    </div>
  );
}

export function MatrixRain({ className = '' }: { className?: string }) {
  const [columns, setColumns] = useState<string[][]>([]);

  useEffect(() => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789@#$%^&*(){}[]|;:,.<>?/~`';
    const numColumns = 20;
    const newColumns: string[][] = [];

    for (let i = 0; i < numColumns; i++) {
      const columnChars: string[] = [];
      const length = Math.floor(Math.random() * 10) + 5;
      for (let j = 0; j < length; j++) {
        columnChars.push(chars[Math.floor(Math.random() * chars.length)]);
      }
      newColumns.push(columnChars);
    }

    setColumns(newColumns);

    const interval = setInterval(() => {
      setColumns((cols) =>
        cols.map((col) => {
          const newCol = [...col];
          newCol.shift();
          newCol.push(chars[Math.floor(Math.random() * chars.length)]);
          return newCol;
        })
      );
    }, 100);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className={`flex justify-center gap-1 overflow-hidden h-32 opacity-20 ${className}`}>
      {columns.map((col, i) => (
        <div key={i} className="flex flex-col text-green-500 text-xs">
          {col.map((char, j) => (
            <span
              key={j}
              style={{ opacity: 1 - j / col.length }}
            >
              {char}
            </span>
          ))}
        </div>
      ))}
    </div>
  );
}
