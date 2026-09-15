/**
 * Selects UIDs to fetch after UID SEARCH, preserving monotonic order and batch limits.
 */
export function pickBillingImapCandidateUids(
  searchUids: number[],
  lastProcessedUid: number,
  batchSize: number,
): number[] {
  if (batchSize <= 0) {
    return [];
  }

  const candidates = searchUids
    .filter((uid) => Number.isInteger(uid) && uid > lastProcessedUid)
    .sort((a, b) => a - b);

  return candidates.slice(0, batchSize);
}
