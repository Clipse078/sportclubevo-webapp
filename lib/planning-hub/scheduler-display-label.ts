import type { WeekplannerItem, WeekplannerResourceRef } from "@/lib/weekplanner/types";
import { weekplannerActivityTypeLabel } from "@/lib/planning-hub/item-presenters";

/** Strip redundant leading club tokens (generic, not tenant-specific). */
export function compactSchedulerTeamName(name: string): string {
  const trimmed = name.trim();
  if (!trimmed) return trimmed;
  const withoutClub = trimmed.replace(
    /^(?:fc|sc|sv|sk|fk)\s+[\wäöüÄÖÜß.-]+\s+/i,
    "",
  );
  const candidate = withoutClub.trim();
  if (candidate.length > 0 && candidate.length <= trimmed.length) {
    return candidate.length > 28 ? `${candidate.slice(0, 26)}…` : candidate;
  }
  return trimmed.length > 28 ? `${trimmed.slice(0, 26)}…` : trimmed;
}

export function schedulerDisplayIdentity(item: WeekplannerItem): string {
  if (item.type === "TRAINING") {
    const raw = item.teamNames[0] ?? item.title;
    return compactSchedulerTeamName(raw);
  }
  if (item.type === "MATCH") {
    const team = item.teamNames[0];
    const home = team ? compactSchedulerTeamName(team) : item.title;
    if (item.opponentName) {
      const opp = compactSchedulerTeamName(item.opponentName);
      return `${home} vs ${opp}`;
    }
    return home;
  }
  if (item.type === "TOURNAMENT") {
    const title = item.title.trim();
    return title.length > 32 ? `${title.slice(0, 30)}…` : title;
  }
  const title = item.title.trim();
  return title.length > 32 ? `${title.slice(0, 30)}…` : title;
}

export function schedulerResourceLabel(ref: WeekplannerResourceRef): string {
  const name = ref.name?.trim();
  if (name) return name;
  return ref.code.replace(/_/g, " ");
}

export function schedulerResourceCodes(item: WeekplannerItem, max = 3): string {
  const labels: string[] = [];
  for (const ref of item.pitchAllocations) labels.push(schedulerResourceLabel(ref));
  for (const ref of item.dressingRoomAllocations) labels.push(schedulerResourceLabel(ref));
  if (item.type === "MATCH") {
    for (const ref of item.awayDressingRoomAllocations) labels.push(schedulerResourceLabel(ref));
  }
  const unique = [...new Set(labels)];
  if (unique.length === 0) return "";
  if (unique.length <= max) return unique.join(" · ");
  return `${unique.slice(0, max).join(" · ")} · +${unique.length - max}`;
}

export function schedulerBlockSubtitle(item: WeekplannerItem): string | null {
  if (item.type === "TRAINING") return null;
  return weekplannerActivityTypeLabel(item.type);
}
