export type TeamChatMessageCursor = {
  publishedAt: string;
  id: string;
};

export function encodeTeamChatCursor(cursor: TeamChatMessageCursor): string {
  return Buffer.from(JSON.stringify(cursor), "utf8").toString("base64url");
}

export function decodeTeamChatCursor(raw: string | null | undefined): TeamChatMessageCursor | null {
  if (!raw?.trim()) return null;
  try {
    const parsed = JSON.parse(Buffer.from(raw, "base64url").toString("utf8")) as TeamChatMessageCursor;
    if (!parsed?.id || !parsed?.publishedAt) return null;
    return parsed;
  } catch {
    return null;
  }
}
