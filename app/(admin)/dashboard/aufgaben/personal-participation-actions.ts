"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { getActiveTenant } from "@/lib/tenants/active-tenant";
import { submitParticipationPersonalAction } from "@/lib/personal-actions/submit-participation-response";
import type { SubmitParticipationPersonalActionInput } from "@/lib/personal-actions/submit-participation-response";

export type PersonalParticipationActionResult =
  | { ok: true }
  | { ok: false; message: string };

export async function respondToPersonalParticipationAction(
  input: SubmitParticipationPersonalActionInput,
): Promise<PersonalParticipationActionResult> {
  const session = await auth();
  if (!session?.user?.id) {
    return { ok: false, message: "Nicht angemeldet." };
  }

  const tenant = await getActiveTenant();
  const tenantId = tenant?.id ?? session.user.activeTenantId;
  if (!tenantId) {
    return { ok: false, message: "Kein Mandant aktiv." };
  }

  const result = await submitParticipationPersonalAction(tenantId, session.user.id, input);

  if (result.ok) {
    revalidatePath("/dashboard/aufgaben");
    revalidatePath("/dashboard");
    return { ok: true };
  }

  return result;
}
