"use client";

import { useState, useCallback, createContext, useContext, ReactNode } from "react";
import { ShadowMode } from "@/lib/shadow/shadow-purchase";

interface ShadowModeContextValue {
  /** Current privacy mode */
  mode: ShadowMode;
  /** Set the privacy mode */
  setMode: (mode: ShadowMode) => void;
  /** Toggle between standard and shadow */
  toggleMode: () => void;
  /** Whether currently shielding funds */
  isShielding: boolean;
  /** Set shielding state */
  setIsShielding: (value: boolean) => void;
  /** Whether shadow mode is active */
  isShadowMode: boolean;
}

const ShadowModeContext = createContext<ShadowModeContextValue | undefined>(
  undefined
);

interface ShadowModeProviderProps {
  children: ReactNode;
  defaultMode?: ShadowMode;
}

export function ShadowModeProvider({
  children,
  defaultMode = "shadow",
}: ShadowModeProviderProps) {
  const [mode, setModeState] = useState<ShadowMode>(defaultMode);
  const [isShielding, setIsShielding] = useState(false);

  const setMode = useCallback((newMode: ShadowMode) => {
    setModeState(newMode);
  }, []);

  const toggleMode = useCallback(() => {
    setModeState((prev) => (prev === "standard" ? "shadow" : "standard"));
  }, []);

  const value: ShadowModeContextValue = {
    mode,
    setMode,
    toggleMode,
    isShielding,
    setIsShielding,
    isShadowMode: mode === "shadow",
  };

  return (
    <ShadowModeContext.Provider value={value}>
      {children}
    </ShadowModeContext.Provider>
  );
}

export function useShadowMode(): ShadowModeContextValue {
  const context = useContext(ShadowModeContext);

  if (!context) {
    throw new Error("useShadowMode must be used within a ShadowModeProvider");
  }

  return context;
}
