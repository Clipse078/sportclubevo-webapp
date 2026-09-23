"use server";

import { revalidatePath } from "next/cache";
import {
  activateRequirement,
  cancelRequirement,
  closeRequirement,
  createRequirementDraft,
  setRequirementDraftAudienceSelectors,
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
import {
  searchRequirementAudienceOrgUnits,
  searchRequirementAudienceRoles,
  searchRequirementAudienceTargetGroups,
  searchRequirementAudienceTeams,
} from "@/lib/requirements/audience-selector-search";
import { previewRequirementDraftAudience } from "@/lib/requirements/requirement-audience-preview";
import { parseRequirementDeadlineAndRemindersFromForm } from "@/lib/requirements/requirement-reminder-form";
import type { RequirementAudienceSelection } from "@/lib/requirements/types";
import { requirementDetailHref } from "@/lib/requirements/management-navigation";
import { parseIdListFromForm } from "@/lib/tasks/task-access-grants";
import type { WorkspaceDocumentPickerOption } from "@/lib/workspace/document-access";
import {
  linkRequirementDocumentReference,
  listRequirementDocumentReferences,
  searchWorkspaceDocumentsForRequirementReferenceLink,
  unlinkRequirementDocumentReference,
  type LinkRequirementDocumentVersionInput,
  type RequirementDocumentReferenceDto,
} from "@/lib/requirements/requirement-document-reference-service";
import { listAuthorizedWorkspaceDocumentVersions } from "@/lib/workspace/reference/workspace-version-link-validation";

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

function parseAudienceSelectionFromForm(formData: FormData) {
  return {
    personIds: parseIdListFromForm(formData.get("audiencePersonIds")),
    teamIds: parseIdListFromForm(formData.get("audienceTeamIds")),
    orgUnitIds: parseIdListFromForm(formData.get("audienceOrgUnitIds")),
    roleIds: parseIdListFromForm(formData.get("audienceRoleIds")),
    targetGroupIds: parseIdListFromForm(formData.get("audienceTargetGroupIds")),
  };
}

async function parseRequirementScheduleFields(
  tenantId: string,
  formData: FormData,
): Promise<
  | { ok: false; message: string }
  | {
      ok: true;
      dueAt: Date | null;
      reminder1At: Date | null;
      reminder2At: Date | null;
      reminder1PresetKey: string | null;
      reminder2PresetKey: string | null;
      remindersConfigured: boolean;
    }
> {
  const schedule = await parseRequirementDeadlineAndRemindersFromForm(tenantId, formData);
  if (schedule === "invalid_due") {
    return { ok: false, message: "Ungültiges Fälligkeitsdatum." };
  }
  if (schedule === "invalid_reminder") {
    return { ok: false, message: "Ungültige Erinnerung." };
  }
  return { ok: true, ...schedule };
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

async function audienceSearchAction<T>(
  searchFn: (tenantId: string, query: string) => Promise<T>,
  query: string,
): Promise<{ ok: true; options: T } | { ok: false; message: string }> {
  const ctx = await getRequirementServiceContext();
  if (!ctx) return { ok: false, message: "Nicht angemeldet." };
  if (!canCreateRequirement(ctx) && !canManageRequirement(ctx)) {
    return { ok: false, message: "Keine Berechtigung für diese Aktion." };
  }
  return { ok: true, options: await searchFn(ctx.tenantId, query) };
}

export async function searchRequirementAudienceTeamsAction(query: string) {
  return audienceSearchAction(searchRequirementAudienceTeams, query);
}

export async function searchRequirementAudienceOrgUnitsAction(query: string) {
  return audienceSearchAction(searchRequirementAudienceOrgUnits, query);
}

export async function searchRequirementAudienceRolesAction(query: string) {
  return audienceSearchAction(searchRequirementAudienceRoles, query);
}

export async function searchRequirementAudienceTargetGroupsAction(query: string) {
  return audienceSearchAction(searchRequirementAudienceTargetGroups, query);
}

export async function previewRequirementDraftAudienceAction(
  selection: RequirementAudienceSelection,
): Promise<
  | { ok: true; preview: Awaited<ReturnType<typeof previewRequirementDraftAudience>> }
  | { ok: false; message: string }
> {
  const ctx = await getRequirementServiceContext();
  if (!ctx) return { ok: false, message: "Nicht angemeldet." };
  if (!canCreateRequirement(ctx) && !canManageRequirement(ctx)) {
    return { ok: false, message: "Keine Berechtigung für diese Aktion." };
  }
  try {
    const preview = await previewRequirementDraftAudience(ctx.tenantId, selection);
    return { ok: true, preview };
  } catch (error) {
    if (error instanceof RequirementTenantMismatchError) {
      return { ok: false, message: "Ungültige Empfängerauswahl." };
    }
    return { ok: false, message: "Empfängervorschau fehlgeschlagen." };
  }
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
    const schedule = await parseRequirementScheduleFields(ctx.tenantId, formData);
    if (!schedule.ok) return schedule;

    const draft = await createRequirementDraft(ctx, {
      title,
      description: typeof description === "string" ? description : null,
      dueAt: schedule.dueAt,
      reminder1At: schedule.reminder1At,
      reminder2At: schedule.reminder2At,
      reminder1PresetKey: schedule.reminder1PresetKey,
      reminder2PresetKey: schedule.reminder2PresetKey,
      remindersConfigured: schedule.remindersConfigured,
    });

    const audience = parseAudienceSelectionFromForm(formData);
    if (
      audience.personIds.length > 0 ||
      audience.teamIds.length > 0 ||
      audience.orgUnitIds.length > 0 ||
      audience.roleIds.length > 0 ||
      audience.targetGroupIds.length > 0
    ) {
      await setRequirementDraftAudienceSelectors(ctx, draft.id, audience);
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
    const schedule = formData.has("dueAt") || formData.has("reminder1Preset")
      ? await parseRequirementScheduleFields(ctx.tenantId, formData)
      : null;
    if (schedule && !schedule.ok) return schedule;

    await updateRequirementDraft(ctx, requirementId, {
      title: typeof title === "string" ? title : undefined,
      description:
        formData.has("description") && typeof formData.get("description") === "string"
          ? (formData.get("description") as string)
          : undefined,
      dueAt: schedule?.ok ? schedule.dueAt : formData.has("dueAt") ? parseDueAtFromForm(formData) : undefined,
      reminder1At: schedule?.ok ? schedule.reminder1At : undefined,
      reminder2At: schedule?.ok ? schedule.reminder2At : undefined,
      reminder1PresetKey: schedule?.ok ? schedule.reminder1PresetKey : undefined,
      reminder2PresetKey: schedule?.ok ? schedule.reminder2PresetKey : undefined,
      remindersConfigured: schedule?.ok ? schedule.remindersConfigured : undefined,
    });

    if (
      formData.has("audiencePersonIds") ||
      formData.has("audienceTeamIds") ||
      formData.has("audienceOrgUnitIds") ||
      formData.has("audienceRoleIds") ||
      formData.has("audienceTargetGroupIds")
    ) {
      await setRequirementDraftAudienceSelectors(ctx, requirementId, parseAudienceSelectionFromForm(formData));
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

export type RequirementDocumentReferenceActionResult =
  | { ok: true }
  | { ok: false; message: string };

export async function searchRequirementDocumentLinkCandidatesAction(
  requirementId: string,
  query: string,
  limit?: number,
): Promise<
  | { ok: true; options: WorkspaceDocumentPickerOption[] }
  | { ok: false; message: string }
> {
  const ctx = await getRequirementServiceContext();
  if (!ctx) return { ok: false, message: "Nicht angemeldet." };

  try {
    const options = await searchWorkspaceDocumentsForRequirementReferenceLink(
      ctx,
      requirementId,
      query,
      limit,
    );
    return { ok: true, options };
  } catch (error) {
    const mapped = mapRequirementError(error);
    return mapped.ok ? { ok: false, message: "Aktion fehlgeschlagen." } : mapped;
  }
}

export async function listRequirementDocumentVersionsForLinkAction(
  requirementId: string,
  documentId: string,
): Promise<
  | {
      ok: true;
      currentVersionId: string | null;
      versions: { id: string; versionNumber: number; filename: string; createdAt: string }[];
    }
  | { ok: false; message: string }
> {
  const ctx = await getRequirementServiceContext();
  if (!ctx) return { ok: false, message: "Nicht angemeldet." };

  try {
    await searchWorkspaceDocumentsForRequirementReferenceLink(ctx, requirementId, "", 1);
  } catch (error) {
    const mapped = mapRequirementError(error);
    return mapped.ok ? { ok: false, message: "Aktion fehlgeschlagen." } : mapped;
  }

  const result = await listAuthorizedWorkspaceDocumentVersions(ctx, documentId);
  if (!result.ok) {
    return { ok: false, message: "Versionen nicht verfügbar." };
  }
  return result;
}

export async function linkRequirementDocumentAction(
  requirementId: string,
  input: LinkRequirementDocumentVersionInput,
): Promise<RequirementDocumentReferenceActionResult> {
  const ctx = await getRequirementServiceContext();
  if (!ctx) return { ok: false, message: "Nicht angemeldet." };

  try {
    await linkRequirementDocumentReference(ctx, requirementId, input);
    revalidateRequirementPaths(requirementId);
    return { ok: true };
  } catch (error) {
    return mapRequirementError(error);
  }
}

export async function unlinkRequirementDocumentReferenceAction(
  requirementId: string,
  referenceId: string,
): Promise<RequirementDocumentReferenceActionResult> {
  const ctx = await getRequirementServiceContext();
  if (!ctx) return { ok: false, message: "Nicht angemeldet." };

  try {
    await unlinkRequirementDocumentReference(ctx, requirementId, referenceId);
    revalidateRequirementPaths(requirementId);
    return { ok: true };
  } catch (error) {
    return mapRequirementError(error);
  }
}

export async function loadRequirementDocumentReferencesAction(
  requirementId: string,
): Promise<
  | { ok: true; references: RequirementDocumentReferenceDto[] }
  | { ok: false; message: string }
> {
  const ctx = await getRequirementServiceContext();
  if (!ctx) return { ok: false, message: "Nicht angemeldet." };

  try {
    const references = await listRequirementDocumentReferences(ctx, requirementId);
    return { ok: true, references };
  } catch (error) {
    const mapped = mapRequirementError(error);
    return mapped.ok ? { ok: false, message: "Aktion fehlgeschlagen." } : mapped;
  }
}

export type { RequirementDocumentReferenceDto };
