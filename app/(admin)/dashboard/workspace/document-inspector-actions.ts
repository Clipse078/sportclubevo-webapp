"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createRequirementDraft } from "@/lib/requirements/requirement-service";
import { linkRequirementDocumentReference } from "@/lib/requirements/requirement-document-reference-service";
import { getRequirementServiceContext } from "@/lib/requirements/server-context";
import { canCreateRequirement } from "@/lib/requirements/requirement-authorization";
import { canReadWorkspaceDocument } from "@/lib/workspace/document-access";
import {
  RequirementForbiddenError,
  RequirementValidationError,
} from "@/lib/requirements/errors";
import { requirementDetailHref } from "@/lib/requirements/management-navigation";

export type DocumentInspectorRequirementActionResult =
  | { ok: true; requirementId: string }
  | { ok: false; message: string };

function mapError(error: unknown): DocumentInspectorRequirementActionResult {
  if (error instanceof RequirementValidationError) {
    return { ok: false, message: error.message };
  }
  if (error instanceof RequirementForbiddenError) {
    return { ok: false, message: "Keine Berechtigung für diese Aktion." };
  }
  return { ok: false, message: "Aktion fehlgeschlagen." };
}

export async function createRequirementLinkedToWorkspaceDocumentAction(
  documentId: string,
  title: string,
): Promise<DocumentInspectorRequirementActionResult> {
  const ctx = await getRequirementServiceContext();
  if (!ctx) return { ok: false, message: "Nicht angemeldet." };

  const normalizedDocumentId = documentId.trim();
  const normalizedTitle = title.trim();
  if (!normalizedDocumentId) {
    return { ok: false, message: "Dokument fehlt." };
  }
  if (!normalizedTitle) {
    return { ok: false, message: "Titel ist erforderlich." };
  }

  if (!canCreateRequirement(ctx)) {
    return { ok: false, message: "Keine Berechtigung für diese Aktion." };
  }

  const readable = await canReadWorkspaceDocument(ctx, normalizedDocumentId);
  if (!readable) {
    return { ok: false, message: "Dokument nicht zugänglich." };
  }

  try {
    const draft = await createRequirementDraft(ctx, { title: normalizedTitle });
    await linkRequirementDocumentReference(ctx, draft.id, {
      documentId: normalizedDocumentId,
    });
    revalidatePath("/dashboard/workspace");
    revalidatePath(requirementDetailHref(draft.id));
    return { ok: true, requirementId: draft.id };
  } catch (error) {
    return mapError(error);
  }
}

export async function navigateToNewRequirementForDocumentAction(documentId: string): Promise<void> {
  const ctx = await getRequirementServiceContext();
  if (!ctx || !canCreateRequirement(ctx)) {
    redirect("/dashboard/aufgaben?bereich=anforderungen");
  }
  const readable = await canReadWorkspaceDocument(ctx, documentId.trim());
  if (!readable) {
    redirect("/dashboard/workspace");
  }
  redirect(
    `/dashboard/aufgaben/anforderungen/neu?returnTo=${encodeURIComponent(
      `/dashboard/workspace?document=${encodeURIComponent(documentId.trim())}`,
    )}`,
  );
}
