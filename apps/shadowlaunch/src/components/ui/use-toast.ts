import { useState, useCallback } from "react";

export interface Toast {
  id: string;
  title: string;
  description?: string;
  variant?: "default" | "destructive";
  duration?: number;
}

// Simple toast implementation using browser alerts for now
// Can be upgraded to a proper toast UI component later
export function useToast() {
  const toast = useCallback((options: Omit<Toast, "id">) => {
    const message = options.description
      ? `${options.title}\n\n${options.description}`
      : options.title;

    if (options.variant === "destructive") {
      alert(`❌ ${message}`);
    } else {
      alert(`✅ ${message}`);
    }
  }, []);

  return { toast };
}
