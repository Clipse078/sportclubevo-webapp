/**
 * SCE-COMM-07 / COMM-18 — poll response actor/subject traceability.
 */

export type PollRecipientSnapshotRow = {
  id: string;
  subjectPersonId: string | null;
  deliveryUserId: string | null;
  viaGuardianSubstitution: boolean;
};

export function selectCanonicalPollSnapshotsForActor(input: {
  snapshots: readonly PollRecipientSnapshotRow[];
  actorUserId: string;
}): PollRecipientSnapshotRow[] {
  const bySubject = new Map<string, PollRecipientSnapshotRow[]>();
  for (const snap of input.snapshots) {
    const subjectId = snap.subjectPersonId?.trim();
    if (!subjectId) continue;
    const list = bySubject.get(subjectId) ?? [];
    list.push(snap);
    bySubject.set(subjectId, list);
  }

  const selected: PollRecipientSnapshotRow[] = [];
  for (const [, group] of bySubject) {
    const forActor = group.filter((s) => s.deliveryUserId === input.actorUserId);
    if (forActor.length === 0) continue;
    const direct = forActor.find((s) => !s.viaGuardianSubstitution);
    selected.push(direct ?? forActor[0]!);
  }
  return selected;
}

export function actorIsGuardianForSubject(input: {
  actorUserId: string;
  subjectSelfUserId: string | null;
  snapshot: PollRecipientSnapshotRow;
}): boolean {
  return (
    input.snapshot.viaGuardianSubstitution &&
    input.actorUserId !== input.subjectSelfUserId
  );
}
