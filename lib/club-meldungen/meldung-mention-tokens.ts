export function meldungMentionDisplayName(firstName: string, lastName: string): string {
  return `${firstName} ${lastName}`.trim();
}

export function meldungMentionToken(firstName: string, lastName: string): string {
  return `@${meldungMentionDisplayName(firstName, lastName)}`;
}

/**
 * Keeps only user IDs whose @token still appears in the message body (removed tokens → no mention row).
 */
export function filterMentionedUserIdsPresentInBody(
  body: string,
  users: Array<{ userId: string; firstName: string; lastName: string }>,
): string[] {
  const present: string[] = [];
  for (const user of users) {
    if (body.includes(meldungMentionToken(user.firstName, user.lastName))) {
      present.push(user.userId);
    }
  }
  return present;
}

export function mentionExcerpt(body: string, maxLen = 140): string {
  const trimmed = body.trim();
  if (trimmed.length <= maxLen) return trimmed;
  return `${trimmed.slice(0, maxLen - 1)}…`;
}