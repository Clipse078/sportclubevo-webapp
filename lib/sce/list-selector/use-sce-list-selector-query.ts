"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { SceSelectorCategoryId } from "@/lib/sce/list-selector/entity-presentation";
import type { SceSelectorResultGroup, SceSelectorSourceType } from "@/lib/sce/list-selector/types";
import {
  SCE_SELECTOR_MIN_SEARCH_LENGTH,
  SCE_SELECTOR_SEARCH_DEBOUNCE_MS,
} from "@/lib/sce/list-selector/sources/constants";

export type SceListSelectorQueryStatus = "idle" | "loading" | "success" | "empty" | "error";

export type SceListSelectorQueryState = {
  query: string;
  setQuery: (value: string) => void;
  category: SceSelectorCategoryId;
  setCategory: (category: SceSelectorCategoryId) => void;
  groups: SceSelectorResultGroup[];
  loading: boolean;
  status: SceListSelectorQueryStatus;
  error: string | null;
  noAccess: boolean;
  retry: () => void;
  resultCount: number;
  statusMessage: string | null;
};

export type SceListSelectorFetchParams = {
  query: string;
  category: SceSelectorCategoryId;
  signal: AbortSignal;
};

const LOAD_ERROR_MESSAGE = "Auswahl konnte nicht geladen werden.";

function deriveStatus(input: {
  loading: boolean;
  error: string | null;
  noAccess: boolean;
  resultCount: number;
  open: boolean;
}): SceListSelectorQueryStatus {
  if (!input.open) return "idle";
  if (input.loading) return "loading";
  if (input.error) return "error";
  if (input.noAccess) return "empty";
  if (input.resultCount === 0) return "empty";
  return "success";
}

export function useSceListSelectorQuery(options: {
  open: boolean;
  enabledTypes: readonly SceSelectorSourceType[];
  fetchResults: (params: SceListSelectorFetchParams) => Promise<{
    groups: SceSelectorResultGroup[];
    noAccess?: boolean;
    error?: string;
  }>;
  onReset?: () => void;
}): SceListSelectorQueryState {
  const { open, fetchResults, onReset } = options;
  const onResetRef = useRef(onReset);
  onResetRef.current = onReset;
  const fetchResultsRef = useRef(fetchResults);
  fetchResultsRef.current = fetchResults;

  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<SceSelectorCategoryId>("all");
  const [groups, setGroups] = useState<SceSelectorResultGroup[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [noAccess, setNoAccess] = useState(false);

  const requestGeneration = useRef(0);
  const activeAbortRef = useRef<AbortController | null>(null);

  const runFetch = useCallback(async (q: string, cat: SceSelectorCategoryId, generation: number) => {
    const controller = new AbortController();
    activeAbortRef.current = controller;
    const { signal } = controller;

    setLoading(true);
    setError(null);

    try {
      const result = await fetchResultsRef.current({ query: q, category: cat, signal });
      if (generation !== requestGeneration.current) return;
      if (signal.aborted) return;
      setNoAccess(Boolean(result.noAccess));
      setGroups(result.groups ?? []);
      if (result.error) {
        setError(result.error);
      }
    } catch (err) {
      if (generation !== requestGeneration.current || signal.aborted) return;
      setGroups([]);
      if (err instanceof Error && err.name === "AbortError") {
        setError(null);
        return;
      }
      if (err instanceof Error && err.message === "SCE_SELECTOR_FETCH_TIMEOUT") {
        setError(LOAD_ERROR_MESSAGE);
        return;
      }
      setError(LOAD_ERROR_MESSAGE);
    } finally {
      if (generation === requestGeneration.current) {
        setLoading(false);
        if (activeAbortRef.current === controller) {
          activeAbortRef.current = null;
        }
      }
    }
  }, []);

  const scheduleFetch = useCallback((q: string, cat: SceSelectorCategoryId) => {
    activeAbortRef.current?.abort();
    activeAbortRef.current = null;
    requestGeneration.current += 1;
    const generation = requestGeneration.current;
    void runFetch(q, cat, generation);
  }, [runFetch]);

  const retry = useCallback(() => {
    scheduleFetch(query, category);
  }, [category, query, scheduleFetch]);

  useEffect(() => {
    if (!open) {
      activeAbortRef.current?.abort();
      activeAbortRef.current = null;
      requestGeneration.current += 1;
      setQuery("");
      setCategory("all");
      setGroups([]);
      setError(null);
      setNoAccess(false);
      setLoading(false);
      onResetRef.current?.();
      return undefined;
    }

    const debounceMs =
      query.trim().length >= SCE_SELECTOR_MIN_SEARCH_LENGTH ? SCE_SELECTOR_SEARCH_DEBOUNCE_MS : 0;

    const handle = window.setTimeout(() => {
      scheduleFetch(query, category);
    }, debounceMs);

    return () => {
      window.clearTimeout(handle);
      activeAbortRef.current?.abort();
      activeAbortRef.current = null;
      requestGeneration.current += 1;
    };
  }, [category, open, query, scheduleFetch]);

  const resultCount = groups.reduce((sum, g) => sum + g.items.length, 0);
  const status = deriveStatus({ loading, error, noAccess, resultCount, open });

  let statusMessage: string | null = null;
  if (loading) {
    statusMessage = query.trim().length >= SCE_SELECTOR_MIN_SEARCH_LENGTH ? "Suche wird geladen" : null;
  } else if (!error && !noAccess) {
    if (resultCount === 0) {
      statusMessage =
        query.trim().length >= SCE_SELECTOR_MIN_SEARCH_LENGTH
          ? `Keine Ergebnisse für „${query.trim()}“`
          : "Keine Einträge vorhanden";
    } else {
      statusMessage = `${resultCount} Ergebnisse`;
    }
  }

  return {
    query,
    setQuery,
    category,
    setCategory,
    groups,
    loading,
    status,
    error,
    noAccess,
    retry,
    resultCount,
    statusMessage,
  };
}
