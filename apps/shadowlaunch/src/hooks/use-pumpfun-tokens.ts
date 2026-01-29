"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import {
  getTrendingTokens,
  getNewTokens,
  getToken,
  searchTokens,
} from "@/lib/pumpfun/client";
import { PumpFunToken, TokenFilterOptions } from "@/lib/pumpfun/types";

interface UsePumpFunTokensReturn {
  /** List of tokens */
  tokens: PumpFunToken[];
  /** Whether tokens are loading */
  isLoading: boolean;
  /** Error message if any */
  error: string | null;
  /** Refresh token list */
  refresh: () => Promise<void>;
  /** Search for tokens */
  search: (query: string) => Promise<void>;
  /** Load trending tokens */
  loadTrending: () => Promise<void>;
  /** Load new tokens */
  loadNew: () => Promise<void>;
  /** Current view mode */
  viewMode: "trending" | "new" | "search";
}

export function usePumpFunTokens(
  initialMode: "trending" | "new" = "trending",
  options: TokenFilterOptions = {}
): UsePumpFunTokensReturn {
  const [tokens, setTokens] = useState<PumpFunToken[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<"trending" | "new" | "search">(
    initialMode
  );

  // Track if initial load has happened to prevent infinite loops
  const hasLoadedRef = useRef(false);

  // Store options in ref to avoid dependency issues
  const optionsRef = useRef(options);
  optionsRef.current = options;

  const loadTrending = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    setViewMode("trending");

    try {
      const data = await getTrendingTokens(optionsRef.current);
      setTokens(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load tokens");
      setTokens([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const loadNew = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    setViewMode("new");

    try {
      const data = await getNewTokens(optionsRef.current.limit || 50);
      setTokens(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load tokens");
      setTokens([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const search = useCallback(async (query: string) => {
    if (!query.trim()) {
      setIsLoading(true);
      setError(null);
      setViewMode("trending");
      try {
        const data = await getTrendingTokens(optionsRef.current);
        setTokens(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load tokens");
        setTokens([]);
      } finally {
        setIsLoading(false);
      }
      return;
    }

    setIsLoading(true);
    setError(null);
    setViewMode("search");

    try {
      const data = await searchTokens(query);
      setTokens(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Search failed");
      setTokens([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const refresh = useCallback(async () => {
    if (viewMode === "trending") {
      await loadTrending();
    } else if (viewMode === "new") {
      await loadNew();
    }
    // For search, user needs to re-search manually
  }, [viewMode, loadTrending, loadNew]);

  // Load initial data only once
  useEffect(() => {
    if (hasLoadedRef.current) return;
    hasLoadedRef.current = true;

    if (initialMode === "new") {
      loadNew();
    } else {
      loadTrending();
    }
  }, [initialMode, loadNew, loadTrending]);

  return {
    tokens,
    isLoading,
    error,
    refresh,
    search,
    loadTrending,
    loadNew,
    viewMode,
  };
}

/**
 * Hook to fetch a single token by mint
 */
export function usePumpFunToken(mint: string | null) {
  const [token, setToken] = useState<PumpFunToken | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!mint) {
      setToken(null);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const data = await getToken(mint);
      setToken(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load token");
      setToken(null);
    } finally {
      setIsLoading(false);
    }
  }, [mint]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return {
    token,
    isLoading,
    error,
    refresh,
  };
}
