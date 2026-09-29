"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { SceSelectorCategoryId } from "@/lib/sce/list-selector/entity-presentation";
import type {
  SceSelectorGroupCursors,
  SceSelectorResultGroup,
  SceSelectorSourceType,
} from "@/lib/sce/list-selector/types";
import {
  SCE_SELECTOR_MIN_SEARCH_LENGTH,
  SCE_SELECTOR_SEARCH_DEBOUNCE_MS,
} from "@/lib/sce/list-selector/sources/constants";
import { mergeSceSelectorResultGroups } from "@/lib/sce/list-selector/source-pagination";

export type SceListSelectorQueryStatus = "idle" | "loading" | "success" | "empty" | "error";

export type SceListSelectorQueryState = {
  query: string;
  setQuery: (value: string) => void;
  category: SceSelectorCategoryId;
  setCategory: (category: SceSelectorCategoryId) => void;
  groups: SceSelectorResultGroup[];
  loading: boolean;
  loadingMore: boolean;
  status: SceListSelectorQueryStatus;
  error: string | null;
  noAccess: boolean;
  retry: () => void;
  loadMore: (sourceType: SceSelectorSourceType) => void;
  resultCount: number;
  statusMessage: string | null;
};

export type SceListSelectorFetchParams = {
  query: string;
  category: SceSelectorCategoryId;
  signal: AbortSignal;
  cursors?: SceSelectorGroupCursors;
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
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [noAccess, setNoAccess] = useState(false);

  const requestGeneration = useRef(0);
  const activeAbortRef = useRef<AbortController | null>(null);

  const runFetch = useCallback(
    async (
      q: string,
      cat: SceSelectorCategoryId,
      generation: number,
      input: { cursors?: SceSelectorGroupCursors; append?: boolean },
    ) => {
      const isContinuation = Boolean(input.cursors && Object.keys(input.cursors).length > 0);
      const controller = new AbortController();
      activeAbortRef.current = controller;
      const { signal } = controller;

      if (isContinuation) {
        setLoadingMore(true);
      } else {
        setLoading(true);
        setError(null);
      }

      try {
        const result = await fetchResultsRef.current({
          query: q,
          category: cat,
          signal,
          cursors: input.cursors,
        });
        if (generation !== requestGeneration.current) return;
        if (signal.aborted) return;
        setNoAccess(Boolean(result.noAccess));
        if (input.append) {
          setGroups((prev) => mergeSceSelectorResultGroups(prev, result.groups ?? []));
        } else {
          setGroups(result.groups ?? []);
        }
        if (result.error) {
          setError(result.error);
        }
      } catch (err) {
        if (generation !== requestGeneration.current || signal.aborted) return;
        if (!input.append) {
          setGroups([]);
        }
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
          setLoadingMore(false);
          if (activeAbortRef.current === controller) {
            activeAbortRef.current = null;
          }
        }
      }
    },
    [],
  );

  const scheduleFetch = useCallback(
    (q: string, cat: SceSelectorCategoryId) => {
      activeAbortRef.current?.abort();
      activeAbortRef.current = null;
      requestGeneration.current += 1;
      const generation = requestGeneration.current;
      void runFetch(q, cat, generation, {});
    },
    [runFetch],
  );

  const retry = useCallback(() => {
    scheduleFetch(query, category);
  }, [category, query, scheduleFetch]);

  const loadMore = useCallback(
    (sourceType: SceSelectorSourceType) => {
      const group = groups.find((g) => g.type === sourceType);
      if (!group?.hasMore || !group.nextCursor) return;
      activeAbortRef.current?.abort();
      activeAbortRef.current = null;
      requestGeneration.current += 1;
      const generation = requestGeneration.current;
      void runFetch(query, category, generation, {
        cursors: { [sourceType]: group.nextCursor },
        append: true,
      });
    },
    [category, groups, query, runFetch],
  );

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
      setLoadingMore(false);
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
    statusMessage = query.trim().length >= SCE_SELECTOR_MIN_SEARCH_LENGTH ? "Suche wird geladen" : "Liste wird geladen";
  } else if (loadingMore) {
    statusMessage = "Weitere Einträge werden geladen";
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
    loadingMore,
    status,
    error,
    noAccess,
    retry,
    loadMore,
    resultCount,
    statusMessage,
  };
}
