/**
 * AUFGABEN-06G3 — canonical Requirement ACK adapter for PersonalActions.
 */

import {
  RequirementForbiddenError,
  RequirementNotFoundError,
  RequirementRecipientNotFoundError,
  RequirementValidationError,
} from "@/lib/requirements/errors";
import { acknowledgeRequirementRecipient } from "@/lib/requirements/requirement-service";
import type { RequirementServiceContext } from "@/lib/requirements/types";
import { buildRequirementPersonalActionId } from "./identity";
import { parseRequirementPersonalActionId } from "./parse-requirement-action-id";

export type SubmitRequirementPersonalActionInput = {
  personalActionId: string;
  requirementRecipientId: string;
};

export type SubmitRequirementPersonalActionResult =
  | { ok: true; recipientId: string }
  | { ok: false; message: string };

const USER_MESSAGES = {
  unauthorized: "Du darfst diese Anforderung nicht bestätigen.",
  notFound: "Diese Anforderung ist nicht mehr verfügbar.",
  validation: "Die Bestätigung konnte nicht gespeichert werden.",
  identity: "Ungültige Anforderungs-Aktion.",
  generic: "Die Bestätigung konnte nicht gespeichert werden. Bitte erneut versuchen.",
} as const;

function mapRequirementError(error: unknown): SubmitRequirementPersonalActionResult {
  if (error instanceof RequirementForbiddenError) {
    return { ok: false, message: USER_MESSAGES.unauthorized };
  }
  if (error instanceof RequirementRecipientNotFoundError || error instanceof RequirementNotFoundError) {
    return { ok: false, message: USER_MESSAGES.notFound };
  }
  if (error instanceof RequirementValidationError) {
    return { ok: false, message: USER_MESSAGES.validation };
  }
  throw error;
}

function assertIdentityMatchesInput(input: SubmitRequirementPersonalActionInput): void {
  const parsed = parseRequirementPersonalActionId(input.personalActionId);
  if (!parsed || parsed.recipientId !== input.requirementRecipientId) {
    throw new RequirementValidationError(USER_MESSAGES.identity);
  }
  const expected = buildRequirementPersonalActionId(input.requirementRecipientId);
  if (expected !== input.personalActionId) {
    throw new RequirementValidationError(USER_MESSAGES.identity);
  }
}

export async function submitRequirementPersonalAction(
  ctx: RequirementServiceContext,
  input: SubmitRequirementPersonalActionInput,
): Promise<SubmitRequirementPersonalActionResult> {
  try {
    assertIdentityMatchesInput(input);
    const updated = await acknowledgeRequirementRecipient(ctx, input.requirementRecipientId);
    return { ok: true, recipientId: updated.id };
  } catch (error) {
    return mapRequirementError(error);
  }
}
