'use client';

import { useEffect, useRef, useState } from 'react';
import { motion, useSpring, useTransform, useMotionValue } from 'framer-motion';
import { cn } from '@/lib/utils';

interface AnimatedNumberProps {
  value: number;
  duration?: number;
  formatValue?: (value: number) => string;
  className?: string;
  showSign?: boolean;
  prefix?: string;
  suffix?: string;
  decimals?: number;
}

/**
 * Animated number counter with spring physics
 */
export function AnimatedNumber({
  value,
  duration = 1,
  formatValue,
  className,
  showSign = false,
  prefix = '',
  suffix = '',
  decimals = 2,
}: AnimatedNumberProps) {
  const motionValue = useMotionValue(0);
  const springValue = useSpring(motionValue, {
    stiffness: 100,
    damping: 30,
    duration: duration * 1000,
  });
  const [displayValue, setDisplayValue] = useState('0');

  useEffect(() => {
    motionValue.set(value);
  }, [value, motionValue]);

  useEffect(() => {
    const unsubscribe = springValue.on('change', (latest) => {
      if (formatValue) {
        setDisplayValue(formatValue(latest));
      } else {
        const sign = showSign && latest > 0 ? '+' : '';
        setDisplayValue(`${prefix}${sign}${latest.toFixed(decimals)}${suffix}`);
      }
    });

    return () => unsubscribe();
  }, [springValue, formatValue, showSign, prefix, suffix, decimals]);

  return <span className={className}>{displayValue}</span>;
}

interface AnimatedCurrencyProps {
  value: number; // in cents
  className?: string;
  duration?: number;
}

/**
 * Animated currency display (converts cents to dollars)
 */
export function AnimatedCurrency({
  value,
  className,
  duration = 0.8,
}: AnimatedCurrencyProps) {
  const motionValue = useMotionValue(0);
  const springValue = useSpring(motionValue, {
    stiffness: 100,
    damping: 30,
    duration: duration * 1000,
  });
  const [displayValue, setDisplayValue] = useState('$0.00');

  useEffect(() => {
    motionValue.set(value);
  }, [value, motionValue]);

  useEffect(() => {
    const unsubscribe = springValue.on('change', (latest) => {
      const dollars = latest / 100;
      const sign = dollars > 0 ? '+' : '';
      setDisplayValue(`${sign}$${Math.abs(dollars).toFixed(2)}`);
    });

    return () => unsubscribe();
  }, [springValue]);

  const isPositive = value > 0;
  const isNegative = value < 0;

  return (
    <span
      className={cn(
        className,
        isPositive && 'text-green-600 dark:text-green-400',
        isNegative && 'text-red-600 dark:text-red-400'
      )}
    >
      {displayValue}
    </span>
  );
}

interface AnimatedPercentageProps {
  value: number;
  className?: string;
  duration?: number;
}

/**
 * Animated percentage display
 */
export function AnimatedPercentage({
  value,
  className,
  duration = 0.8,
}: AnimatedPercentageProps) {
  return (
    <AnimatedNumber
      value={value}
      duration={duration}
      className={className}
      showSign
      suffix="%"
      decimals={1}
    />
  );
}

interface FlashingNumberProps {
  value: number;
  previousValue?: number;
  children: React.ReactNode;
  className?: string;
}

/**
 * Component that flashes green/red when value changes
 */
export function FlashingNumber({
  value,
  previousValue,
  children,
  className,
}: FlashingNumberProps) {
  const [flash, setFlash] = useState<'up' | 'down' | null>(null);
  const prevValueRef = useRef(previousValue ?? value);

  useEffect(() => {
    if (value !== prevValueRef.current) {
      setFlash(value > prevValueRef.current ? 'up' : 'down');
      prevValueRef.current = value;

      const timeout = setTimeout(() => {
        setFlash(null);
      }, 600);

      return () => clearTimeout(timeout);
    }
  }, [value]);

  return (
    <motion.span
      className={cn(className, 'transition-colors duration-300')}
      animate={{
        backgroundColor:
          flash === 'up'
            ? 'rgba(34, 197, 94, 0.3)'
            : flash === 'down'
              ? 'rgba(239, 68, 68, 0.3)'
              : 'transparent',
      }}
      transition={{ duration: 0.3 }}
    >
      {children}
    </motion.span>
  );
}

interface CountUpProps {
  end: number;
  start?: number;
  duration?: number;
  delay?: number;
  className?: string;
  formatValue?: (value: number) => string;
}

/**
 * Simple count-up animation from start to end
 */
export function CountUp({
  end,
  start = 0,
  duration = 2,
  delay = 0,
  className,
  formatValue,
}: CountUpProps) {
  const [count, setCount] = useState(start);
  const countRef = useRef(start);
  const startTimeRef = useRef<number | null>(null);

  useEffect(() => {
    const timeout = setTimeout(() => {
      const animate = (timestamp: number) => {
        if (startTimeRef.current === null) {
          startTimeRef.current = timestamp;
        }

        const progress = Math.min(
          (timestamp - startTimeRef.current) / (duration * 1000),
          1
        );

        // Ease out quad
        const easeOut = 1 - (1 - progress) * (1 - progress);
        const currentCount = start + (end - start) * easeOut;

        countRef.current = currentCount;
        setCount(currentCount);

        if (progress < 1) {
          requestAnimationFrame(animate);
        }
      };

      requestAnimationFrame(animate);
    }, delay * 1000);

    return () => clearTimeout(timeout);
  }, [end, start, duration, delay]);

  const displayValue = formatValue
    ? formatValue(count)
    : count.toFixed(0);

  return <span className={className}>{displayValue}</span>;
}
