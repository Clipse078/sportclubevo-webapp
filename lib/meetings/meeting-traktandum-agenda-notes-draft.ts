"use client";

import { useCallback, useSyncExternalStore } from "react";

export type TraktandumAgendaNotesDraft = {
  editing: boolean;
  draftText: string;
  /** Server notes snapshot when edit started (for conditional replace). */
  baselineServerNotes: string | null;
  /** Latest server text after conflict (for reconciliation UI). */
  conflictServerNotes: string | null;
};

const listeners = new Set<() => void>();
const store = new Map<string, TraktandumAgendaNotesDraft>();

function draftKey(meetingId: string, agendaItemId: string): string {
  return `${meetingId}:${agendaItemId}`;
}

export function createEmptyTraktandumAgendaNotesDraft(): TraktandumAgendaNotesDraft {
  return {
    editing: false,
    draftText: "",
    baselineServerNotes: null,
    conflictServerNotes: null,
  };
}

function emit(): void {
  for (const listener of listeners) listener();
}

function getOrCreate(key: string): TraktandumAgendaNotesDraft {
  let draft = store.get(key);
  if (!draft) {
    draft = createEmptyTraktandumAgendaNotesDraft();
    store.set(key, draft);
  }
  return draft;
}

export function readTraktandumAgendaNotesDraft(meetingId: string, agendaItemId: string): TraktandumAgendaNotesDraft {
  return getOrCreate(draftKey(meetingId, agendaItemId));
}

export function patchTraktandumAgendaNotesDraft(
  meetingId: string,
  agendaItemId: string,
  patch: Partial<TraktandumAgendaNotesDraft>,
): TraktandumAgendaNotesDraft {
  const key = draftKey(meetingId, agendaItemId);
  const next = { ...getOrCreate(key), ...patch };
  store.set(key, next);
  emit();
  return next;
}

/** @internal test helper */
export function resetTraktandumAgendaNotesDraftStoreForTests(): void {
  store.clear();
  emit();
}

export function useTraktandumAgendaNotesDraft(meetingId: string, agendaItemId: string) {
  const subscribe = useCallback((onStoreChange: () => void) => {
    listeners.add(onStoreChange);
    return () => listeners.delete(onStoreChange);
  }, []);

  const getSnapshot = useCallback(
    () => readTraktandumAgendaNotesDraft(meetingId, agendaItemId),
    [meetingId, agendaItemId],
  );

  const draft = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);

  const patch = useCallback(
    (partial: Partial<TraktandumAgendaNotesDraft>) =>
      patchTraktandumAgendaNotesDraft(meetingId, agendaItemId, partial),
    [meetingId, agendaItemId],
  );

  return { draft, patch };
}