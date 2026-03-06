'use client';

import { useState, useEffect } from 'react';

interface TypeWriterProps {
  text: string;
  speed?: number;
  className?: string;
  onComplete?: () => void;
  showCursor?: boolean;
}

export function TypeWriter({
  text,
  speed = 50,
  className = '',
  onComplete,
  showCursor = true,
}: TypeWriterProps) {
  const [displayText, setDisplayText] = useState('');
  const [isComplete, setIsComplete] = useState(false);
  const [cursorVisible, setCursorVisible] = useState(true);

  useEffect(() => {
    setDisplayText('');
    setIsComplete(false);
    let index = 0;

    const typeInterval = setInterval(() => {
      if (index < text.length) {
        setDisplayText(text.slice(0, index + 1));
        index++;
      } else {
        setIsComplete(true);
        clearInterval(typeInterval);
        onComplete?.();
      }
    }, speed);

    return () => clearInterval(typeInterval);
  }, [text, speed, onComplete]);

  // Blinking cursor
  useEffect(() => {
    if (!showCursor) return;

    const cursorInterval = setInterval(() => {
      setCursorVisible((v) => !v);
    }, 500);

    return () => clearInterval(cursorInterval);
  }, [showCursor]);

  return (
    <span className={className}>
      {displayText}
      {showCursor && (
        <span className={cursorVisible ? 'opacity-100' : 'opacity-0'}>█</span>
      )}
    </span>
  );
}

interface TypeWriterLinesProps {
  lines: string[];
  lineDelay?: number;
  charSpeed?: number;
  className?: string;
  lineClassName?: string;
}

export function TypeWriterLines({
  lines,
  lineDelay = 500,
  charSpeed = 30,
  className = '',
  lineClassName = '',
}: TypeWriterLinesProps) {
  const [currentLine, setCurrentLine] = useState(0);
  const [completedLines, setCompletedLines] = useState<string[]>([]);
  const [isTyping, setIsTyping] = useState(true);

  const handleLineComplete = () => {
    setCompletedLines((prev) => [...prev, lines[currentLine]]);
    setIsTyping(false);

    setTimeout(() => {
      if (currentLine < lines.length - 1) {
        setCurrentLine((prev) => prev + 1);
        setIsTyping(true);
      }
    }, lineDelay);
  };

  return (
    <div className={className}>
      {completedLines.map((line, i) => (
        <div key={i} className={lineClassName}>
          {line}
        </div>
      ))}
      {currentLine < lines.length && isTyping && (
        <div className={lineClassName}>
          <TypeWriter
            text={lines[currentLine]}
            speed={charSpeed}
            onComplete={handleLineComplete}
          />
        </div>
      )}
    </div>
  );
}
