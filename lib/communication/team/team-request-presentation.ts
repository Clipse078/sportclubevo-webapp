import type { TeamRequestSlotCapacityDto } from "@/lib/communication/team/team-request-types";

export function formatRequestSlotTime(slot: Pick<TeamRequestSlotCapacityDto, "startAt" | "endAt">): string | null {
  if (!slot.startAt) return null;
  const start = new Date(slot.startAt);
  const startLabel = start.toLocaleString("de-CH", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
  if (!slot.endAt) return startLabel;
  const end = new Date(slot.endAt);
  const endLabel = end.toLocaleString("de-CH", { hour: "2-digit", minute: "2-digit" });
  return `${startLabel} – ${endLabel}`;
}
