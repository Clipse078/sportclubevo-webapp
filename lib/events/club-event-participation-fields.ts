import { prisma } from "@/lib/db/prisma";

export async function getClubEventParticipationFields(tenantId: string, eventId: string) {
  return prisma.event.findFirst({
    where: { id: eventId, tenantId, type: "OTHER" },
    select: {
      participationResponseDueAt: true,
      participationReminder1At: true,
      participationReminder2At: true,
      participationReminder1PresetKey: true,
      participationReminder2PresetKey: true,
    },
  });
}
