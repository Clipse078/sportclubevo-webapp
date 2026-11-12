/**
 * Persist meeting participants (create only — keine automatischen Einladungen).
 */

import { prisma } from "@/lib/db/prisma";
import { MeetingParticipantStatus } from "@prisma/client";
import { resolveMeetingPersonSnapshot } from "@/lib/meetings/meeting-person-payload";

function uniquePersonIds(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  const seen = new Set<string>();
  const ids: string[] = [];
  for (const item of raw) {
    const id = typeof item === "string" ? item.trim() : "";
    if (!id || seen.has(id)) continue;
    seen.add(id);
    ids.push(id);
  }
  return ids;
}

export async function createMeetingParticipantsFromPersonIds(input: {
  tenantId: string;
  meetingId: string;
  personIds: unknown;
}): Promise<{ created: number; skippedDuplicates: number }> {
  const requested = uniquePersonIds(input.personIds);
  if (requested.length === 0) return { created: 0, skippedDuplicates: 0 };

  const existing = await prisma.meetingParticipant.findMany({
    where: { meetingId: input.meetingId, personId: { in: requested } },
    select: { personId: true },
  });
  const existingIds = new Set(existing.map((row) => row.personId).filter(Boolean) as string[]);

  let created = 0;
  let skippedDuplicates = existingIds.size;

  for (const personId of requested) {
    if (existingIds.has(personId)) continue;

    const snap = await resolveMeetingPersonSnapshot(input.tenantId, personId);
    if (!snap) continue;

    await prisma.meetingParticipant.create({
      data: {
        meetingId: input.meetingId,
        name: snap.displayName,
        personId: snap.personId,
        userId: snap.userId,
        status: MeetingParticipantStatus.INVITED,
      },
    });
    created += 1;
    existingIds.add(personId);
  }

  return { created, skippedDuplicates };
}
