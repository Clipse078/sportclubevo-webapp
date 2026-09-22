"use server";

import { revalidatePath } from "next/cache";
import {
  activateRequirement,
  cancelRequirement,
  closeRequirement,
  createRequirementDraft,
  setRequirementDraftAudience,
  updateRequirementDraft,
} from "@/lib/requirements/requirement-service";
import { getRequirementServiceContext } from "@/lib/requirements/server-context";
import {
  RequirementForbiddenError,
  RequirementNotFoundError,
  RequirementTenantMismatchError,
  RequirementValidationError,
} from "@/lib/requirements/errors";
import { canCreateRequirement, canManageRequirement } from "@/lib/requirements/requirement-authorization";
import { searchRequirementAudiencePersons } from "@/lib/requirements/person-search";
import { requirementDetailHref } from "@/lib/requirements/management-navigation";
import { parseIdListFromForm } from "@/lib/tasks/task-access-grants";

export type RequirementActionResult =
  | { ok: true; requirementId?: string }
  | { ok: false; message: string };

function revalidateRequirementPaths(requirementId?: string) {
  revalidatePath("/dashboard/aufgaben");
  if (requirementId) {
    revalidatePath(requirementDetailHref(requirementId));
  }
}

function mapRequirementError(error: unknown): RequirementActionResult {
  if (error instanceof RequirementValidationError) {
    return { ok: false, message: error.message };
  }
  if (error instanceof RequirementForbiddenError) {
    return { ok: false, message: "Keine Berechtigung für diese Aktion." };
  }
  if (error instanceof RequirementNotFoundError) {
    return { ok: false, message: "Anforderung nicht gefunden." };
  }
  if (error instanceof RequirementTenantMismatchError) {
    return { ok: false, message: "Ungültige Personenauswahl." };
  }
  return { ok: false, message: "Aktion fehlgeschlagen." };
}

function parseDueAtFromForm(formData: FormData): Date | null {
  const raw = formData.get("dueAt");
  if (typeof raw !== "string" || !raw.trim()) return null;
  const parsed = new Date(raw);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export async function searchRequirementPersonsAction(
  query: string,
): Promise<
  | { ok: true; options: Awaited<ReturnType<typeof searchRequirementAudiencePersons>> }
  | { ok: false; message: string }
> {
  const ctx = await getRequirementServiceContext();
  if (!ctx) return { ok: false, message: "Nicht angemeldet." };
  if (!canCreateRequirement(ctx) && !canManageRequirement(ctx)) {
    return { ok: false, message: "Keine Berechtigung für diese Aktion." };
  }
  const options = await searchRequirementAudiencePersons(ctx.tenantId, query);
  return { ok: true, options };
}

export async function createRequirementDraftAction(
  formData: FormData,
): Promise<RequirementActionResult> {
  const ctx = await getRequirementServiceContext();
  if (!ctx) return { ok: false, message: "Nicht angemeldet." };
  if (!canCreateRequirement(ctx)) {
    return { ok: false, message: "Keine Berechtigung für diese Aktion." };
  }

  try {
    const title = formData.get("title");
    if (typeof title !== "string") {
      return { ok: false, message: "Titel ist erforderlich." };
    }
    const description = formData.get("description");
    const draft = await createRequirementDraft(ctx, {
      title,
      description: typeof description === "string" ? description : null,
      dueAt: parseDueAtFromForm(formData),
    });

    const audienceIds = parseIdListFromForm(formData.get("audiencePersonIds"));
    if (audienceIds.length > 0) {
      await setRequirementDraftAudience(ctx, draft.id, audienceIds);
    }

    revalidateRequirementPaths(draft.id);
    return { ok: true, requirementId: draft.id };
  } catch (error) {
    return mapRequirementError(error);
  }
}

export async function updateRequirementDraftAction(
  requirementId: string,
  formData: FormData,
): Promise<RequirementActionResult> {
  const ctx = await getRequirementServiceContext();
  if (!ctx) return { ok: false, message: "Nicht angemeldet." };

  try {
    const title = formData.get("title");
    await updateRequirementDraft(ctx, requirementId, {
      title: typeof title === "string" ? title : undefined,
      description:
        formData.has("description") && typeof formData.get("description") === "string"
          ? (formData.get("description") as string)
          : undefined,
      dueAt: formData.has("dueAt") ? parseDueAtFromForm(formData) : undefined,
    });

    if (formData.has("audiencePersonIds")) {
      const audienceIds = parseIdListFromForm(formData.get("audiencePersonIds"));
      await setRequirementDraftAudience(ctx, requirementId, audienceIds);
    }

    revalidateRequirementPaths(requirementId);
    return { ok: true, requirementId };
  } catch (error) {
    return mapRequirementError(error);
  }
}

export async function activateRequirementAction(requirementId: string): Promise<RequirementActionResult> {
  const ctx = await getRequirementServiceContext();
  if (!ctx) return { ok: false, message: "Nicht angemeldet." };

  try {
    await activateRequirement(ctx, requirementId);
    revalidateRequirementPaths(requirementId);
    return { ok: true, requirementId };
  } catch (error) {
    return mapRequirementError(error);
  }
}

export async function closeRequirementAction(requirementId: string): Promise<RequirementActionResult> {
  const ctx = await getRequirementServiceContext();
  if (!ctx) return { ok: false, message: "Nicht angemeldet." };

  try {
    await closeRequirement(ctx, requirementId);
    revalidateRequirementPaths(requirementId);
    return { ok: true, requirementId };
  } catch (error) {
    return mapRequirementError(error);
  }
}

export async function cancelRequirementAction(requirementId: string): Promise<RequirementActionResult> {
  const ctx = await getRequirementServiceContext();
  if (!ctx) return { ok: false, message: "Nicht angemeldet." };

  try {
    await cancelRequirement(ctx, requirementId);
    revalidateRequirementPaths(requirementId);
    return { ok: true, requirementId };
  } catch (error) {
    return mapRequirementError(error);
  }
}
