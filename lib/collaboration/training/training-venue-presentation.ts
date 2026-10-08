/**
 * SCE-COLLAB-01A — canonical training venue/resource labels for change presentation.
 */

import { resolveCanonicalPitchPresentationLabel } from "@/lib/publishing/presentation/canonical-pitch-presentation";
import type { ResolvedTrainingAllocationGroup } from "@/lib/training/effective-training-allocation-resolution";

function formatResourceRow(
  row: ResolvedTrainingAllocationGroup["pitch"][number],
): string {
  const resource = row.facilityResource;
  const facilityName = resource.facility.name.trim();
  const label =
    resolveCanonicalPitchPresentationLabel({
      code: resource.code,
      name: resource.name,
      facilityName,
      resourceType: resource.type as "FULL_PITCH" | "HALF_PITCH" | "DRESSING_ROOM" | "OTHER",
    }) ?? resource.name.trim();

  if (label && facilityName && !label.includes(facilityName)) {
    return `${facilityName} · ${label}`;
  }
  return label || facilityName || resource.code;
}

/** Primary playable venue line (pitch/hall/other playable). */
export function formatTrainingPlayableVenueLabel(
  resolved: ResolvedTrainingAllocationGroup,
): string | null {
  const primary =
    resolved.pitch[0] ?? resolved.otherPlayable[0] ?? resolved.dressingRoom[0] ?? null;
  if (!primary) return null;
  return formatResourceRow(primary);
}

export function formatTrainingDressingRoomLabel(
  resolved: ResolvedTrainingAllocationGroup,
): string | null {
  if (resolved.dressingRoom.length === 0) return null;
  return resolved.dressingRoom.map((row) => formatResourceRow(row)).join(" · ");
}
