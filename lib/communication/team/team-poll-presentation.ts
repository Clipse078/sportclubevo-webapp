import { DEFAULT_TENANT_EVENT_TIMEZONE } from "@/lib/events/tenant-local-datetime";

export function formatPollOptionLabel(input: {
  label: string | null;
  startAt: string | null;
  endAt: string | null;
  timeZone?: string;
}): string {
  if (input.label?.trim()) return input.label.trim();
  if (!input.startAt) return "Option";
  const tz = input.timeZone ?? DEFAULT_TENANT_EVENT_TIMEZONE;
  const start = new Date(input.startAt);
  const startLabel = start.toLocaleString("de-CH", {
    timeZone: tz,
    weekday: "short",
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
  if (!input.endAt) return startLabel;
  const end = new Date(input.endAt);
  const endLabel = end.toLocaleTimeString("de-CH", {
    timeZone: tz,
    hour: "2-digit",
    minute: "2-digit",
  });
  return `${startLabel} – ${endLabel}`;
}
