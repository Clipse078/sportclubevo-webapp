import type { WeekplannerItem } from "@/lib/weekplanner/types";

export function weekplannerActivityTypeLabel(type: WeekplannerItem["type"]): string {
  switch (type) {
    case "TRAINING":
      return "Training";
    case "MATCH":
      return "Spiel";
    case "TOURNAMENT":
      return "Turnier";
    case "VERANSTALTUNG":
      return "Veranstaltung";
    default:
      return type;
  }
}

export function weekplannerPrimaryLabel(item: WeekplannerItem): string {
  if (item.type === "MATCH" && item.opponentName) {
    return `${item.teamNames[0] ?? item.title} vs. ${item.opponentName}`;
  }
  if (item.type === "TRAINING") return item.teamNames[0] ?? item.title;
  return item.title;
}

export function weekplannerTeamLine(item: WeekplannerItem): string | null {
  if (item.type === "TRAINING") return item.title;
  if (item.teamNames.length > 0) return item.teamNames.join(", ");
  return null;
}
