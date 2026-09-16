import { prisma } from "@/lib/db/prisma";
import { PLATFORM_DRESSING_ROOM_OCCUPANCY_PRESETS } from "./defaults";
import { validateDressingRoomOccupancyMinutes } from "./validation";
import type { TenantDressingRoomOccupancyPresets } from "./types";

export function mapTenantPresetRow(
  row: {
    trainingBeforeMinutes: number;
    trainingAfterMinutes: number;
    matchBeforeMinutes: number;
    matchAfterMinutes: number;
    tournamentBeforeMinutes: number;
    tournamentAfterMinutes: number;
  } | null,
): TenantDressingRoomOccupancyPresets {
  if (!row) return PLATFORM_DRESSING_ROOM_OCCUPANCY_PRESETS;
  return {
    training: {
      beforeMinutes: row.trainingBeforeMinutes,
      afterMinutes: row.trainingAfterMinutes,
    },
    match: {
      beforeMinutes: row.matchBeforeMinutes,
      afterMinutes: row.matchAfterMinutes,
    },
    tournament: {
      beforeMinutes: row.tournamentBeforeMinutes,
      afterMinutes: row.tournamentAfterMinutes,
    },
  };
}

export async function getTenantDressingRoomOccupancyPresets(
  tenantId: string,
): Promise<TenantDressingRoomOccupancyPresets> {
  const row = await prisma.tenantDressingRoomOccupancyPreset.findUnique({
    where: { tenantId },
  });
  return mapTenantPresetRow(row);
}

export type UpdateTenantDressingRoomOccupancyPresetsInput = {
  trainingBeforeMinutes: number;
  trainingAfterMinutes: number;
  matchBeforeMinutes: number;
  matchAfterMinutes: number;
  tournamentBeforeMinutes: number;
  tournamentAfterMinutes: number;
};

export function validateTenantPresetInput(
  input: UpdateTenantDressingRoomOccupancyPresetsInput,
): UpdateTenantDressingRoomOccupancyPresetsInput {
  return {
    trainingBeforeMinutes: validateDressingRoomOccupancyMinutes(
      input.trainingBeforeMinutes,
      "trainingBeforeMinutes",
    ),
    trainingAfterMinutes: validateDressingRoomOccupancyMinutes(
      input.trainingAfterMinutes,
      "trainingAfterMinutes",
    ),
    matchBeforeMinutes: validateDressingRoomOccupancyMinutes(
      input.matchBeforeMinutes,
      "matchBeforeMinutes",
    ),
    matchAfterMinutes: validateDressingRoomOccupancyMinutes(
      input.matchAfterMinutes,
      "matchAfterMinutes",
    ),
    tournamentBeforeMinutes: validateDressingRoomOccupancyMinutes(
      input.tournamentBeforeMinutes,
      "tournamentBeforeMinutes",
    ),
    tournamentAfterMinutes: validateDressingRoomOccupancyMinutes(
      input.tournamentAfterMinutes,
      "tournamentAfterMinutes",
    ),
  };
}

export async function upsertTenantDressingRoomOccupancyPresets(
  tenantId: string,
  input: UpdateTenantDressingRoomOccupancyPresetsInput,
): Promise<TenantDressingRoomOccupancyPresets> {
  const validated = validateTenantPresetInput(input);
  const row = await prisma.tenantDressingRoomOccupancyPreset.upsert({
    where: { tenantId },
    create: { tenantId, ...validated },
    update: validated,
  });
  return mapTenantPresetRow(row);
}
