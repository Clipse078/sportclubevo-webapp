import type { PersonalEventProjectionActor } from "@/lib/personal-agenda/event-projection-access";

export function buildProgrammeProjectionActor(input: {
  userId: string;
  tenantId: string;
  permissionKeys: readonly string[];
}): PersonalEventProjectionActor {
  return {
    userId: input.userId,
    tenantId: input.tenantId,
    permissionKeys: [...input.permissionKeys],
  };
}
