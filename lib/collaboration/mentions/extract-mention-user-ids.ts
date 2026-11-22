import { SCE_INLINE_MENTION_MARK_NAME } from "@/lib/collaboration/mentions/inline-mention-mark";

function walkNode(node: unknown, out: Set<string>): void {
  if (!node || typeof node !== "object") return;
  const record = node as Record<string, unknown>;
  if (record.type === "text" && Array.isArray(record.marks)) {
    for (const mark of record.marks) {
      if (
        mark &&
        typeof mark === "object" &&
        (mark as Record<string, unknown>).type === SCE_INLINE_MENTION_MARK_NAME
      ) {
        const attrs = (mark as Record<string, unknown>).attrs as
          | Record<string, unknown>
          | undefined;
        const userId = attrs?.userId;
        if (typeof userId === "string" && userId.trim()) {
          out.add(userId.trim());
        }
      }
    }
  }
  if (Array.isArray(record.content)) {
    for (const child of record.content) walkNode(child, out);
  }
}

/** Collects stable user IDs from TipTap JSON (draft or published). */
export function extractMentionUserIdsFromTipTapJson(
  document: unknown,
): string[] {
  const ids = new Set<string>();
  walkNode(document, ids);
  return [...ids];
}

export function diffNewMentionUserIds(
  previousPublished: unknown,
  nextPublished: unknown,
): string[] {
  const before = new Set(extractMentionUserIdsFromTipTapJson(previousPublished));
  return extractMentionUserIdsFromTipTapJson(nextPublished).filter((id) => !before.has(id));
}