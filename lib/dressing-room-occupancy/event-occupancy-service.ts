import { prisma } from "@/lib/db/prisma";
import type { DressingRoomOccupancyMode } from "./types";
import { validateDressingRoomOccupancyMinutes } from "./validation";

export type UpdateDressingRoomOccupancyInput = {
  mode: DressingRoomOccupancyMode;
  beforeMinutes?: number | null;
  afterMinutes?: number | null;
};

export function normalizeDressingRoomOccupancyUpdate(
  input: UpdateDressingRoomOccupancyInput,
): {
  mode: DressingRoomOccupancyMode;
  beforeMinutes: number | null;
  afterMinutes: number | null;
} {
  if (input.mode === "DEFAULT") {
    return { mode: "DEFAULT", beforeMinutes: null, afterMinutes: null };
  }
  return {
    mode: "CUSTOM",
    beforeMinutes: validateDressingRoomOccupancyMinutes(
      input.beforeMinutes ?? 0,
      "dressingRoomBeforeMinutes",
    ),
    afterMinutes: validateDressingRoomOccupancyMinutes(
      input.afterMinutes ?? 0,
      "dressingRoomAfterMinutes",
    ),
  };
}

export async function updateTrainingSessionDressingRoomOccupancy(
  tenantId: string,
  sessionId: string,
  input: UpdateDressingRoomOccupancyInput,
): Promise<void> {
  const normalized = normalizeDressingRoomOccupancyUpdate(input);
  const result = await prisma.trainingSession.updateMany({
    where: { id: sessionId, tenantId },
    data: {
      dressingRoomOccupancyMode: normalized.mode,
      dressingRoomBeforeMinutes: normalized.beforeMinutes,
      dressingRoomAfterMinutes: normalized.afterMinutes,
    },
  });
  if (result.count === 0) {
    throw new Error("Training session not found");
  }
}

export async function updateEventDressingRoomOccupancy(
  tenantId: string,
  eventId: string,
  input: UpdateDressingRoomOccupancyInput,
): Promise<void> {
  const normalized = normalizeDressingRoomOccupancyUpdate(input);
  const result = await prisma.event.updateMany({
    where: { id: eventId, tenantId },
    data: {
      dressingRoomOccupancyMode: normalized.mode,
      dressingRoomBeforeMinutes: normalized.beforeMinutes,
      dressingRoomAfterMinutes: normalized.afterMinutes,
    },
  });
  if (result.count === 0) {
    throw new Error("Event not found");
  }
}
