"use client";

import { useCallback, useSyncExternalStore } from "react";

export type TraktandumOutcomeForm = "decision" | "pendenz" | "note" | null;

export type TraktandumOutcomeOwnerDraft = {
  id: string;
  displayName: string;
};

export type TraktandumOutcomeDraft = {
  activeForm: TraktandumOutcomeForm;
  decisionTitle: string;
  decisionDescription: string;
  decisionRationale: string;
  showDecisionDetails: boolean;
  pendenzTitle: string;
  pendenzOwner: TraktandumOutcomeOwnerDraft | null;
  pendenzDueDate: string;
  pendenzDescription: string;
  showPendenzDetails: boolean;
  noteText: string;
  offerPendenzAfterDecision: boolean;
  lastSavedDecisionTitle: string | null;
};

const listeners = new Set<() => void>();
const store = new Map<string, TraktandumOutcomeDraft>();

function draftKey(meetingId: string, agendaItemId: string): string {
  return `${meetingId}:${agendaItemId}`;
}

export function createEmptyTraktandumOutcomeDraft(): TraktandumOutcomeDraft {
  return {
    activeForm: null,
    decisionTitle: "",
    decisionDescription: "",
    decisionRationale: "",
    showDecisionDetails: false,
    pendenzTitle: "",
    pendenzOwner: null,
    pendenzDueDate: "",
    pendenzDescription: "",
    showPendenzDetails: false,
    noteText: "",
    offerPendenzAfterDecision: false,
    lastSavedDecisionTitle: null,
  };
}

function emit(): void {
  for (const listener of listeners) listener();
}

function getOrCreate(key: string): TraktandumOutcomeDraft {
  let draft = store.get(key);
  if (!draft) {
    draft = createEmptyTraktandumOutcomeDraft();
    store.set(key, draft);
  }
  return draft;
}

export function readTraktandumOutcomeDraft(meetingId: string, agendaItemId: string): TraktandumOutcomeDraft {
  return getOrCreate(draftKey(meetingId, agendaItemId));
}

export function patchTraktandumOutcomeDraft(
  meetingId: string,
  agendaItemId: string,
  patch: Partial<TraktandumOutcomeDraft>,
): TraktandumOutcomeDraft {
  const key = draftKey(meetingId, agendaItemId);
  const next = { ...getOrCreate(key), ...patch };
  store.set(key, next);
  emit();
  return next;
}

export function resetTraktandumOutcomeDraft(meetingId: string, agendaItemId: string): void {
  const key = draftKey(meetingId, agendaItemId);
  store.set(key, createEmptyTraktandumOutcomeDraft());
  emit();
}

/** @internal test helper */
export function resetTraktandumOutcomeDraftStoreForTests(): void {
  store.clear();
  emit();
}

export function useTraktandumOutcomeDraft(meetingId: string, agendaItemId: string) {
  const subscribe = useCallback((onStoreChange: () => void) => {
    listeners.add(onStoreChange);
    return () => listeners.delete(onStoreChange);
  }, []);

  const getSnapshot = useCallback(
    () => readTraktandumOutcomeDraft(meetingId, agendaItemId),
    [meetingId, agendaItemId],
  );

  const draft = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);

  const patch = useCallback(
    (patchPartial: Partial<TraktandumOutcomeDraft>) =>
      patchTraktandumOutcomeDraft(meetingId, agendaItemId, patchPartial),
    [meetingId, agendaItemId],
  );

  const reset = useCallback(() => resetTraktandumOutcomeDraft(meetingId, agendaItemId), [meetingId, agendaItemId]);

  return { draft, patch, reset };
}