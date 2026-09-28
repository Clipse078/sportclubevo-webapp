/**
 * SCE-COMM-EVO-06 — validate, preview, and render personalisation templates.
 */

import type { CommunicationContextRef } from "@/lib/communication/platform/communication-context";
import type {
  PersonalisationFieldDiagnostic,
  PersonalisationRenderResult,
  PersonalisationValidateResult,
} from "@/lib/communication/personalisation/types";
import { getPersonalisationFieldDefinition } from "@/lib/communication/personalisation/field-registry";
import {
  extractPersonalisationTokens,
  extractUnknownPersonalisationKeys,
} from "@/lib/communication/personalisation/token-parser";
import {
  loadPersonalisationContext,
  loadRecipientPersonsBatch,
  type LoadedRecipientPerson,
} from "@/lib/communication/personalisation/load-personalisation-context";
import {
  resolvePersonalisationFieldValue,
  type PersonalisationRenderScope,
} from "@/lib/communication/personalisation/resolve-field-values";
import { resolveFieldAvailabilityForContext } from "@/lib/communication/personalisation/field-availability";
import { prisma } from "@/lib/db/prisma";

export function templateContainsPersonalisationTokens(text: string | null | undefined): boolean {
  if (!text?.trim()) return false;
  return extractPersonalisationTokens(text).length > 0;
}

export function validatePersonalisationTemplate(input: {
  subject?: string | null;
  bodyText: string;
  contextRef: CommunicationContextRef;
}): PersonalisationValidateResult {
  const combined = `${input.subject ?? ""}\n${input.bodyText}`;
  const unknownTokens = extractUnknownPersonalisationKeys(combined);
  const syntaxErrors: string[] = [];
  const contextErrors: string[] = [];

  for (const token of extractPersonalisationTokens(combined)) {
    const def = getPersonalisationFieldDefinition(token.key);
    if (!def) continue;
    const availability = resolveFieldAvailabilityForContext(def, input.contextRef, null);
    if (availability === "UNAVAILABLE") {
      contextErrors.push(`"${def.labelDe}" ist in diesem Kontext nicht verfügbar.`);
    }
    if (availability === "CONTEXT_REQUIRED") {
      contextErrors.push(`"${def.labelDe}" benötigt zusätzlichen Kontext.`);
    }
    if (!def.allowedMissingPolicies.includes(token.missingPolicy)) {
      syntaxErrors.push(
        `"${def.labelDe}": Fallback-Modus "${token.missingPolicy}" ist nicht erlaubt.`,
      );
    }
  }

  return {
    ok: unknownTokens.length === 0 && syntaxErrors.length === 0 && contextErrors.length === 0,
    syntaxErrors,
    unknownTokens,
    contextErrors,
    recipientWarnings: [],
    blocksSend: false,
  };
}

function applyMissingPolicy(
  resolution: Awaited<ReturnType<typeof resolvePersonalisationFieldValue>>,
  token: ReturnType<typeof extractPersonalisationTokens>[number],
  defLabel: string,
): { text: string; diagnostic: PersonalisationFieldDiagnostic; blocksSend: boolean } {
  if (resolution.outcome === "RESOLVED" && resolution.value) {
    return {
      text: resolution.value,
      diagnostic: {
        key: token.key,
        labelDe: defLabel,
        outcome: "RESOLVED",
      },
      blocksSend: false,
    };
  }

  const outcome = resolution.outcome;
  if (token.missingPolicy === "BLOCK_SEND" || outcome === "AMBIGUOUS") {
    return {
      text: "",
      diagnostic: {
        key: token.key,
        labelDe: defLabel,
        outcome: outcome === "AMBIGUOUS" ? "AMBIGUOUS" : "MISSING",
        messageDe: resolution.messageDe,
      },
      blocksSend: true,
    };
  }
  if (token.missingPolicy === "REPLACEMENT") {
    const fb = token.fallbackReplacement ?? "";
    return {
      text: fb,
      diagnostic: {
        key: token.key,
        labelDe: defLabel,
        outcome: outcome,
        usedFallback: true,
        fallbackText: fb,
        messageDe: resolution.messageDe,
      },
      blocksSend: false,
    };
  }
  return {
    text: "",
    diagnostic: {
      key: token.key,
      labelDe: defLabel,
      outcome,
      messageDe: resolution.messageDe,
    },
    blocksSend: false,
  };
}

export async function renderPersonalisationText(input: {
  template: string;
  scope: PersonalisationRenderScope;
}): Promise<PersonalisationRenderResult> {
  const tokens = extractPersonalisationTokens(input.template);
  if (tokens.length === 0) {
    return { text: input.template, diagnostics: [], blocksSend: false, unknownTokens: [] };
  }

  const unknownTokens = extractUnknownPersonalisationKeys(input.template);
  let blocksSend = unknownTokens.length > 0;
  const diagnostics: PersonalisationFieldDiagnostic[] = [];
  let cursor = 0;
  let output = "";

  for (const token of tokens) {
    output += input.template.slice(cursor, token.start);
    cursor = token.end;

    const def = getPersonalisationFieldDefinition(token.key);
    if (!def) {
      output += token.raw;
      diagnostics.push({
        key: token.key,
        labelDe: token.key,
        outcome: "UNAVAILABLE",
        messageDe: "Unbekanntes Feld",
      });
      continue;
    }

    const resolution = await resolvePersonalisationFieldValue(token.key, input.scope);
    const applied = applyMissingPolicy(resolution, token, def.labelDe);
    output += applied.text;
    diagnostics.push(applied.diagnostic);
    if (applied.blocksSend) blocksSend = true;
  }
  output += input.template.slice(cursor);

  return { text: output, diagnostics, blocksSend, unknownTokens };
}

export async function buildPersonalisationRenderScope(input: {
  tenantId: string;
  contextRef: CommunicationContextRef;
  subjectPersonId: string;
  deliveryUserId?: string;
  viaGuardianSubstitution: boolean;
  guardianPersonId: string | null;
  senderUserId: string;
  communicationId?: string | null;
  communicationKind?: string | null;
  emailSenderDisplayName?: string | null;
  emailSenderAddress?: string | null;
  allowContactFields?: boolean;
  at?: Date;
}): Promise<{ scope: PersonalisationRenderScope | null; error?: string }> {
  const context = await loadPersonalisationContext({
    tenantId: input.tenantId,
    contextRef: input.contextRef,
  });
  if (!context) return { scope: null, error: "Tenant-Kontext nicht gefunden." };

  const personIds = [
    input.subjectPersonId,
    input.deliveryUserId,
    input.guardianPersonId,
  ].filter(Boolean) as string[];

  const personMap = await loadRecipientPersonsBatch({
    tenantId: input.tenantId,
    personIds,
  });

  const subjectPerson = personMap.get(input.subjectPersonId);
  if (!subjectPerson) return { scope: null, error: "Betreffperson nicht gefunden." };

  let deliveryPerson = subjectPerson;
  const effectiveDeliveryUserId = input.deliveryUserId ?? subjectPerson.userId;
  if (effectiveDeliveryUserId) {
    const byUserInBatch = [...personMap.values()].find((p) => p.userId === effectiveDeliveryUserId);
    if (byUserInBatch) {
      deliveryPerson = byUserInBatch;
    } else {
      const userPerson = await prisma.person.findFirst({
        where: { tenantId: input.tenantId, userId: effectiveDeliveryUserId },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          displayName: true,
          email: true,
          phone: true,
          userId: true,
        },
      });
      if (userPerson) deliveryPerson = userPerson;
    }
  }

  const guardianPerson =
    input.guardianPersonId && personMap.has(input.guardianPersonId)
      ? personMap.get(input.guardianPersonId)!
      : null;

  const senderPerson = await prisma.person.findFirst({
    where: { tenantId: input.tenantId, userId: input.senderUserId },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      displayName: true,
      email: true,
      phone: true,
      userId: true,
    },
  });

  const scope: PersonalisationRenderScope = {
    tenantId: input.tenantId,
    context,
    contextRef: input.contextRef,
    recipient: deliveryPerson,
    deliveryPerson,
    subjectPerson,
    guardianPerson,
    viaGuardianSubstitution: input.viaGuardianSubstitution,
    senderPerson: senderPerson as LoadedRecipientPerson | null,
    senderDisplayName: input.emailSenderDisplayName ?? null,
    senderEmail: input.emailSenderAddress ?? null,
    communicationId: input.communicationId ?? null,
    communicationKind: input.communicationKind ?? null,
    allowContactFields: input.allowContactFields ?? true,
    at: input.at ?? new Date(),
  };

  return { scope };
}

export async function previewPersonalisationForRecipient(input: {
  tenantId: string;
  contextRef: CommunicationContextRef;
  subject: string | null;
  bodyText: string;
  subjectPersonId: string;
  deliveryUserId?: string;
  viaGuardianSubstitution?: boolean;
  guardianPersonId?: string | null;
  senderUserId: string;
  communicationId?: string | null;
  communicationKind?: string | null;
}): Promise<{
  renderedSubject: string | null;
  renderedBodyText: string;
  subjectDiagnostics: PersonalisationFieldDiagnostic[];
  bodyDiagnostics: PersonalisationFieldDiagnostic[];
  blocksSend: boolean;
  contextSummary: string | null;
  error?: string;
}> {
  const built = await buildPersonalisationRenderScope({
    tenantId: input.tenantId,
    contextRef: input.contextRef,
    subjectPersonId: input.subjectPersonId,
    deliveryUserId: input.deliveryUserId,
    viaGuardianSubstitution: input.viaGuardianSubstitution ?? false,
    guardianPersonId: input.guardianPersonId ?? null,
    senderUserId: input.senderUserId,
    communicationId: input.communicationId,
    communicationKind: input.communicationKind,
  });
  if (!built.scope) {
    return {
      renderedSubject: input.subject,
      renderedBodyText: input.bodyText,
      subjectDiagnostics: [],
      bodyDiagnostics: [],
      blocksSend: true,
      contextSummary: null,
      error: built.error,
    };
  }

  const subjectRender = input.subject
    ? await renderPersonalisationText({ template: input.subject, scope: built.scope })
    : null;
  const bodyRender = await renderPersonalisationText({ template: input.bodyText, scope: built.scope });

  const contextSummary = formatContextSummary(built.scope);

  return {
    renderedSubject: subjectRender?.text ?? input.subject,
    renderedBodyText: bodyRender.text,
    subjectDiagnostics: subjectRender?.diagnostics ?? [],
    bodyDiagnostics: bodyRender.diagnostics,
    blocksSend: Boolean(subjectRender?.blocksSend || bodyRender.blocksSend),
    contextSummary,
  };
}

function formatContextSummary(scope: PersonalisationRenderScope): string | null {
  const parts: string[] = [];
  if (scope.context.contextTeamName) parts.push(scope.context.contextTeamName);
  const event = scope.context.event;
  if (event) {
    parts.push(`${event.type} · ${event.title}`);
    const pitch = event.pitchCode ? ` · ${event.pitchCode}` : "";
    if (pitch) parts.push(pitch);
  }
  return parts.length ? parts.join("") : null;
}
