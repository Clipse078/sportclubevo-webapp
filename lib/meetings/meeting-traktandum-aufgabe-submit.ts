"use client";

/**
 * Shared in-flight Aufgabe creates per Traktandum (focus card + expanded row).
 * Survives duplicate clicks across two mounted surfaces.
 */

const inflight = new Map<string, Promise<{ taskId: string; deduplicated?: boolean }>>();

export function traktandumAufgabeSubmitKey(meetingId: string, agendaItemId: string, clientRequestId: string): string {
  return `${meetingId}:${agendaItemId}:${clientRequestId}`;
}

export function runTraktandumAufgabeSubmit<T extends { taskId: string }>(
  key: string,
  run: () => Promise<T>,
): Promise<T> {
  const existing = inflight.get(key);
  if (existing) return existing as Promise<T>;
  const promise = run().finally(() => {
    inflight.delete(key);
  });
  inflight.set(key, promise);
  return promise;
}

/** @internal */
export function resetTraktandumAufgabeSubmitRegistryForTests(): void {
  inflight.clear();
}