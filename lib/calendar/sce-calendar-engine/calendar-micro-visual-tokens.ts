/** Shared MICRO calendar tile icon geometry (matches list-row operational meta scale). */
export const SCE_CALENDAR_MICRO_VISUAL = {
  metaRowClass: "flex min-w-0 items-center gap-0.5",
  metaIconClass: "h-3 w-3 shrink-0 text-[var(--muted)] opacity-80",
  timeClass: "min-w-0 truncate font-mono text-[0.5625rem] tabular-nums text-[var(--foreground)]",
  locationRowClass: "flex min-w-0 items-center gap-0.5",
  locationTextClass: "min-w-0 truncate text-[0.5rem] text-[var(--text-2)]",
} as const;
