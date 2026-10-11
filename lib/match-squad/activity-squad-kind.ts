/** Activity types that share Event-scoped squad selection (MatchSquad aggregate). */
export type ActivitySquadEventKind = "MATCH" | "TOURNAMENT";

export function participationEventKindForActivitySquad(
  kind: ActivitySquadEventKind,
): "MATCH" | "TOURNAMENT" {
  return kind;
}
