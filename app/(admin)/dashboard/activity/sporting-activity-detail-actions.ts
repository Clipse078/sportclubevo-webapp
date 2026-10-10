"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { getActiveTenant } from "@/lib/tenants/active-tenant";
import { respondToPersonalParticipationAction } from "@/app/(admin)/dashboard/aufgaben/personal-participation-actions";
import type { SportingActivityDetailParticipation } from "@/lib/sporting-activity-detail/types";

export type SportingActivityDetailParticipationSubmitResult =
  | { ok: true }
  | { ok: false; message: string };

export async function submitSportingActivityDetailParticipation(input: {
  participation: SportingActivityDetailParticipation;
  status: "YES" | "NO" | "MAYBE";
}): Promise<SportingActivityDetailParticipationSubmitResult> {
  const session = await auth();
  if (!session?.user?.id) {
    return { ok: false, message: "Nicht angemeldet." };
  }

  const tenant = await getActiveTenant();
  if (!tenant?.id) {
    return { ok: false, message: "Diese Aktivität ist nicht mehr verfügbar." };
  }

  const { participation, status } = input;
  if (!participation.canRespond || !participation.personalActionId) {
    return { ok: false, message: "Die Rückmeldung konnte nicht gespeichert werden." };
  }

  const result = await respondToPersonalParticipationAction({
    personalActionId: participation.personalActionId,
    personId: participation.personId,
    teamSeasonId: participation.teamSeasonId,
    eventKind: participation.eventKind,
    trainingSessionId: participation.trainingSessionId,
    eventId: participation.eventId,
    status,
  });

  if (!result.ok) {
    return result;
  }

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/kalender");
  return { ok: true };
}
