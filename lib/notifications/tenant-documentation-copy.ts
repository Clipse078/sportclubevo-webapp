export function buildTenantDocMentionCopy(input: {
  actorDisplayName: string;
  pageTitle: string;
}): { title: string; body: string } {
  const actor = input.actorDisplayName.trim() || "Jemand";
  const page = input.pageTitle.trim() || "eine Seite";
  return {
    title: "Erwähnung in der Dokumentation",
    body: `${actor} hat dich in „${page}“ erwähnt.`,
  };
}