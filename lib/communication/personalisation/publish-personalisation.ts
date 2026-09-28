/**
 * SCE-COMM-EVO-06 — batch render + validate at dispatch.
 */

import type { CommunicationContextRef } from "@/lib/communication/platform/communication-context";
import type { RecipientSnapshotRow } from "@/lib/communication/platform/recipient-resolution/pipeline";
import {
  buildPersonalisationRenderScope,
  renderPersonalisationText,
  templateContainsPersonalisationTokens,
  validatePersonalisationTemplate,
} from "@/lib/communication/personalisation/personalisation-engine";
import { TeamCommunicationValidationError } from "@/lib/communication/team/team-communication-errors";
import { loadRecipientPersonsBatch } from "@/lib/communication/personalisation/load-personalisation-context";

export type PersonalisedSnapshotExtras = {
  renderedSubject: string | null;
  renderedBodyText: string;
  personalisationDiagnosticsJson?: Record<string, unknown>;
};

export async function validatePersonalisationBeforePublish(input: {
  subject: string | null;
  bodyText: string;
  contextRef: CommunicationContextRef;
}): Promise<void> {
  if (!templateContainsPersonalisationTokens(input.subject) && !templateContainsPersonalisationTokens(input.bodyText)) {
    return;
  }
  const result = validatePersonalisationTemplate({
    subject: input.subject,
    bodyText: input.bodyText,
    contextRef: input.contextRef,
  });
  if (!result.ok) {
    const msg = [
      ...result.unknownTokens.map((k) => `Unbekanntes Feld: <${k}>`),
      ...result.syntaxErrors,
      ...result.contextErrors,
    ].join(" ");
    throw new TeamCommunicationValidationError(msg || "Personalisierung ungültig");
  }
}

export async function renderPersonalisationForDeliveryTargets(input: {
  tenantId: string;
  contextRef: CommunicationContextRef;
  subject: string | null;
  bodyText: string;
  senderUserId: string;
  communicationId: string;
  communicationKind: string;
  emailSenderDisplayName?: string | null;
  emailSenderAddress?: string | null;
  deliveryTargets: readonly RecipientSnapshotRow[];
  at?: Date;
}): Promise<Map<string, PersonalisedSnapshotExtras>> {
  const needsRender =
    templateContainsPersonalisationTokens(input.subject) ||
    templateContainsPersonalisationTokens(input.bodyText);
  const keyFor = (row: RecipientSnapshotRow) =>
    `${row.subjectPersonId}:${row.deliveryUserId}:${row.channel}`;

  if (!needsRender) {
    return new Map();
  }

  const guardianIds = input.deliveryTargets
    .map((r) => r.guardianPersonId)
    .filter(Boolean) as string[];
  await loadRecipientPersonsBatch({
    tenantId: input.tenantId,
    personIds: guardianIds,
  });

  const out = new Map<string, PersonalisedSnapshotExtras>();

  for (const target of input.deliveryTargets) {
    const built = await buildPersonalisationRenderScope({
      tenantId: input.tenantId,
      contextRef: input.contextRef,
      subjectPersonId: target.subjectPersonId,
      deliveryUserId: target.deliveryUserId,
      viaGuardianSubstitution: target.viaGuardianSubstitution,
      guardianPersonId: target.guardianPersonId ?? null,
      senderUserId: input.senderUserId,
      communicationId: input.communicationId,
      communicationKind: input.communicationKind,
      emailSenderDisplayName: input.emailSenderDisplayName,
      emailSenderAddress: input.emailSenderAddress,
      at: input.at,
    });
    if (!built.scope) {
      throw new TeamCommunicationValidationError(built.error ?? "Personalisierung fehlgeschlagen");
    }

    const subjectRender = input.subject
      ? await renderPersonalisationText({ template: input.subject, scope: built.scope })
      : null;
    const bodyRender = await renderPersonalisationText({ template: input.bodyText, scope: built.scope });

    if (subjectRender?.blocksSend || bodyRender.blocksSend) {
      throw new TeamCommunicationValidationError(
        "Versand blockiert: fehlende oder mehrdeutige Personalisierungsfelder.",
      );
    }

    out.set(keyFor(target), {
      renderedSubject: subjectRender?.text ?? input.subject,
      renderedBodyText: bodyRender.text,
      personalisationDiagnosticsJson: {
        subject: subjectRender?.diagnostics ?? [],
        body: bodyRender.diagnostics,
      },
    });
  }

  return out;
}
