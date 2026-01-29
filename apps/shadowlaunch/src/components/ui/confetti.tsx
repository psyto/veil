'use client';

import { useCallback, useEffect, useRef } from 'react';
import confetti from 'canvas-confetti';

interface ConfettiOptions {
  particleCount?: number;
  spread?: number;
  startVelocity?: number;
  decay?: number;
  gravity?: number;
  colors?: string[];
  origin?: { x: number; y: number };
}

const defaultWinColors = ['#22c55e', '#16a34a', '#15803d', '#fbbf24', '#f59e0b'];

/**
 * Fire a burst of confetti
 */
export function fireConfetti(options: ConfettiOptions = {}) {
  const defaults: ConfettiOptions = {
    particleCount: 100,
    spread: 70,
    startVelocity: 30,
    decay: 0.94,
    gravity: 1,
    colors: defaultWinColors,
    origin: { x: 0.5, y: 0.6 },
  };

  confetti({
    ...defaults,
    ...options,
  });
}

/**
 * Fire confetti from both sides (celebration effect)
 */
export function fireCelebration() {
  const count = 200;
  const defaults = {
    origin: { y: 0.7 },
    colors: defaultWinColors,
  };

  function fire(particleRatio: number, opts: confetti.Options) {
    confetti({
      ...defaults,
      ...opts,
      particleCount: Math.floor(count * particleRatio),
    });
  }

  fire(0.25, {
    spread: 26,
    startVelocity: 55,
  });

  fire(0.2, {
    spread: 60,
  });

  fire(0.35, {
    spread: 100,
    decay: 0.91,
    scalar: 0.8,
  });

  fire(0.1, {
    spread: 120,
    startVelocity: 25,
    decay: 0.92,
    scalar: 1.2,
  });

  fire(0.1, {
    spread: 120,
    startVelocity: 45,
  });
}

/**
 * Fire confetti from left and right cannon style
 */
export function fireCannonConfetti() {
  const end = Date.now() + 500;

  const colors = defaultWinColors;

  (function frame() {
    confetti({
      particleCount: 3,
      angle: 60,
      spread: 55,
      origin: { x: 0 },
      colors: colors,
    });
    confetti({
      particleCount: 3,
      angle: 120,
      spread: 55,
      origin: { x: 1 },
      colors: colors,
    });

    if (Date.now() < end) {
      requestAnimationFrame(frame);
    }
  })();
}

/**
 * Fire realistic confetti shower
 */
export function fireRealisticConfetti() {
  const duration = 3000;
  const animationEnd = Date.now() + duration;
  const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 0 };

  function randomInRange(min: number, max: number) {
    return Math.random() * (max - min) + min;
  }

  const interval: ReturnType<typeof setInterval> = setInterval(function () {
    const timeLeft = animationEnd - Date.now();

    if (timeLeft <= 0) {
      return clearInterval(interval);
    }

    const particleCount = 50 * (timeLeft / duration);

    confetti({
      ...defaults,
      particleCount,
      origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 },
      colors: defaultWinColors,
    });
    confetti({
      ...defaults,
      particleCount,
      origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 },
      colors: defaultWinColors,
    });
  }, 250);
}

interface UseConfettiOptions {
  autoTrigger?: boolean;
  effect?: 'burst' | 'celebration' | 'cannon' | 'realistic';
}

/**
 * Hook to manage confetti effects
 */
export function useConfetti(options: UseConfettiOptions = {}) {
  const { autoTrigger = false, effect = 'celebration' } = options;
  const triggered = useRef(false);

  const trigger = useCallback(() => {
    switch (effect) {
      case 'burst':
        fireConfetti();
        break;
      case 'cannon':
        fireCannonConfetti();
        break;
      case 'realistic':
        fireRealisticConfetti();
        break;
      case 'celebration':
      default:
        fireCelebration();
        break;
    }
  }, [effect]);

  useEffect(() => {
    if (autoTrigger && !triggered.current) {
      triggered.current = true;
      trigger();
    }
  }, [autoTrigger, trigger]);

  return { trigger };
}

/**
 * Simple component that fires confetti on mount
 */
export function ConfettiTrigger({
  effect = 'celebration',
}: {
  effect?: 'burst' | 'celebration' | 'cannon' | 'realistic';
}) {
  useConfetti({ autoTrigger: true, effect });
  return null;
}
