import { SCE_INLINE_MENTION_MARK_NAME } from "@/lib/collaboration/mentions/inline-mention-mark";
import { prisma } from "@/lib/db/prisma";

function cloneWithMentionLabels(
  node: unknown,
  labelByUserId: ReadonlyMap<string, string>,
): unknown {
  if (!node || typeof node !== "object") return node;
  const record = { ...(node as Record<string, unknown>) };

  if (record.type === "text" && Array.isArray(record.marks)) {
    record.marks = record.marks.map((mark) => {
      if (
        !mark ||
        typeof mark !== "object" ||
        (mark as Record<string, unknown>).type !== SCE_INLINE_MENTION_MARK_NAME
      ) {
        return mark;
      }
      const attrs = {
        ...(((mark as Record<string, unknown>).attrs as Record<string, unknown>) ?? {}),
      };
      const userId = typeof attrs.userId === "string" ? attrs.userId : "";
      const resolved = labelByUserId.get(userId);
      if (resolved) {
        attrs.label = resolved;
      }
      return { ...(mark as Record<string, unknown>), attrs };
    });
  }

  if (Array.isArray(record.content)) {
    record.content = record.content.map((child) =>
      cloneWithMentionLabels(child, labelByUserId),
    );
  }

  return record;
}

/** Refreshes mention display labels from canonical person identity (userId stays stable). */
export async function enrichTipTapMentionLabels(
  tenantId: string,
  document: unknown,
): Promise<unknown> {
  if (!document || typeof document !== "object") return document;

  const { extractMentionUserIdsFromTipTapJson } = await import(
    "@/lib/collaboration/mentions/extract-mention-user-ids"
  );
  const userIds = extractMentionUserIdsFromTipTapJson(document);
  if (userIds.length === 0) return document;

  const people = await prisma.person.findMany({
    where: { tenantId, userId: { in: userIds }, isActive: true },
    select: {
      userId: true,
      firstName: true,
      lastName: true,
      displayName: true,
    },
  });

  const labelByUserId = new Map<string, string>();
  for (const row of people) {
    if (!row.userId) continue;
    const label =
      row.displayName?.trim() ||
      `${row.firstName} ${row.lastName}`.trim() ||
      "Unbekannt";
    labelByUserId.set(row.userId, label);
  }

  return cloneWithMentionLabels(document, labelByUserId);
}