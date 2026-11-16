const DRESSING_ROOM_PREFIX_PATTERN = /^(garderobe|kabine)\b/i;

/**
 * Dashboard cockpit preview — human-readable dressing-room line (e.g. «Garderobe E1»).
 */
export function formatProgrammeDashboardPreviewDressingRoomLabel(rawLabel: string): string {
  const trimmed = rawLabel.trim();
  if (!trimmed) return trimmed;
  if (DRESSING_ROOM_PREFIX_PATTERN.test(trimmed)) {
    return trimmed;
  }
  return `Garderobe ${trimmed}`;
}