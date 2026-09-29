"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { SceSelectorCategoryId } from "@/lib/sce/list-selector/entity-presentation";
import type { SceSelectorResultGroup, SceSelectorSourceType } from "@/lib/sce/list-selector/types";
import {
  SCE_SELECTOR_MIN_SEARCH_LENGTH,
  SCE_SELECTOR_SEARCH_DEBOUNCE_MS,
} from "@/lib/sce/list-selector/sources/constants";

export type SceListSelectorQueryState = {
  query: string;
  setQuery: (value: string) => void;
  category: SceSelectorCategoryId;
  setCategory: (category: SceSelectorCategoryId) => void;
  groups: SceSelectorResultGroup[];
  loading: boolean;
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
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<SceSelectorCategoryId>("all");
  const [groups, setGroups] = useState<SceSelectorResultGroup[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [noAccess, setNoAccess] = useState(false);
  const requestGeneration = useRef(0);

  const runFetch = useCallback(
    async (q: string, cat: SceSelectorCategoryId, generation: number, signal: AbortSignal) => {
      setLoading(true);
      setError(null);
      try {
        const result = await fetchResults({ query: q, category: cat, signal });
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
        setError(
          err instanceof Error && err.name === "AbortError"
            ? null
            : "Auswahl konnte nicht geladen werden.",
        );
      } finally {
        if (generation === requestGeneration.current) {
          setLoading(false);
        }
      }
    },
    [fetchResults],
  );

  const retry = useCallback(() => {
    requestGeneration.current += 1;
    const generation = requestGeneration.current;
    const controller = new AbortController();
    void runFetch(query, category, generation, controller.signal);
  }, [category, query, runFetch]);

  useEffect(() => {
    if (!open) {
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

    let controller: AbortController | null = null;
    const handle = window.setTimeout(() => {
      controller = new AbortController();
      requestGeneration.current += 1;
      const generation = requestGeneration.current;
      void runFetch(query, category, generation, controller.signal);
    }, debounceMs);

    return () => {
      window.clearTimeout(handle);
      controller?.abort();
    };
  }, [category, open, query, runFetch]);

  const resultCount = groups.reduce((sum, g) => sum + g.items.length, 0);

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
    error,
    noAccess,
    retry,
    resultCount,
    statusMessage,
  };
}
