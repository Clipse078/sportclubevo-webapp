export function pickInboundImapCandidateUids(
  searchUids: number[],
  lastProcessedUid: number,
  batchSize: number,
): number[] {
  const filtered = searchUids.filter((uid) => uid > lastProcessedUid).sort((a, b) => a - b);
  return filtered.slice(0, batchSize);
}
