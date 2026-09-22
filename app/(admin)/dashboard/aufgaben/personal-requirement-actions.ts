"use server";

import { revalidatePath } from "next/cache";
import { getRequirementServiceContext } from "@/lib/requirements/server-context";
import { submitRequirementPersonalAction } from "@/lib/personal-actions/submit-requirement-response";
import type { SubmitRequirementPersonalActionInput } from "@/lib/personal-actions/submit-requirement-response";

export type PersonalRequirementActionResult =
  | { ok: true }
  | { ok: false; message: string };

export async function acknowledgePersonalRequirementAction(
  input: SubmitRequirementPersonalActionInput,
): Promise<PersonalRequirementActionResult> {
  const ctx = await getRequirementServiceContext();
  if (!ctx) {
    return { ok: false, message: "Nicht angemeldet." };
  }

  const result = await submitRequirementPersonalAction(ctx, input);

  if (result.ok) {
    revalidatePath("/dashboard/aufgaben");
    revalidatePath("/dashboard");
    return { ok: true };
  }

  return result;
}
