/**
 * POST /api/admin/vl-invitations/send
 *
 * Explicit send endpoint — blocked by default (dry-run). Live path uses canonical onboarding mutations.
 */

import { NextRequest, NextResponse } from "next/server";
import { requireApiPermission } from "@/lib/permissions/require-api-permission";
import { PERMISSIONS } from "@/lib/permissions/permissions";
import {
  assertVlInvitationSendAllowed,
  resolveVlInvitationSendMode,
} from "@/lib/admin/vl-onboarding/vl-invitation-send-policy";
import {
  parseAndValidateBulkInvitationEmails,
} from "@/lib/admin/vl-onboarding/bulk-invitation-emails";
import {
  createLiveVlInvitationTransport,
  createMockVlInvitationTransport,
} from "@/lib/admin/vl-onboarding/vl-invitation-transport";
import { orchestrateVlInvitationSend } from "@/lib/admin/vl-onboarding/vl-invitation-orchestration";
import type { VlInvitationRecipientIdentity } from "@/lib/admin/vl-onboarding/vl-invitation-orchestration";

function parseRecipientIdentities(body: Record<string, unknown>): VlInvitationRecipientIdentity[] {
  const raw = body.recipients;
  if (!Array.isArray(raw)) return [];
  return raw
    .filter(
      (item) =>
        typeof item === "object" &&
        item !== null &&
        typeof (item as { email?: unknown }).email === "string",
    )
    .map((item) => {
      const row = item as {
        email: string;
        firstName?: string;
        lastName?: string;
        functionKey?: string | null;
      };
      return {
        email: row.email.trim().toLowerCase(),
        firstName: typeof row.firstName === "string" ? row.firstName.trim() : undefined,
        lastName: typeof row.lastName === "string" ? row.lastName.trim() : undefined,
        functionKey:
          row.functionKey === null || typeof row.functionKey === "string"
            ? row.functionKey
            : undefined,
      };
    });
}

export async function POST(request: NextRequest) {
  const access = await requireApiPermission(PERMISSIONS.USERS_INVITE);
  if (!access.ok) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }

  const tenantId = access.session.user?.activeTenantId;
  if (!tenantId) {
    return NextResponse.json({ error: "Kein Mandanten-Kontext." }, { status: 403 });
  }

  const actorUserId = access.session.user?.effectiveUserId ?? access.session.user?.id;
  if (!actorUserId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Ungültiger Anfrage-Inhalt." }, { status: 400 });
  }

  const confirmLiveSend = (body as { confirmLiveSend?: unknown })?.confirmLiveSend === true;
  const sendCheck = assertVlInvitationSendAllowed(confirmLiveSend);
  const liveExecution = sendCheck.ok;

  const raw = typeof (body as { raw?: unknown })?.raw === "string" ? (body as { raw: string }).raw : "";
  const validationRows = raw ? parseAndValidateBulkInvitationEmails(raw) : [];
  const identities = parseRecipientIdentities(
    typeof body === "object" && body !== null ? (body as Record<string, unknown>) : {},
  );

  try {
    const transport = liveExecution
      ? createLiveVlInvitationTransport()
      : createMockVlInvitationTransport();

    const result = await orchestrateVlInvitationSend({
      tenantId,
      actorUserId,
      validationRows,
      identities,
      transport,
      liveExecution,
      sendPolicyError: sendCheck.error,
      sendPolicyMode: resolveVlInvitationSendMode(),
    });

    if (liveExecution && !result.contributorRoleProvisioned) {
      return NextResponse.json(
        {
          ...result,
          sent: false,
          error:
            "Live-Versand blockiert — Mandanten-Rolle «Vereinsleitung (Pilot)» fehlt. Rollen-Sync zuerst ausführen.",
        },
        { status: 409 },
      );
    }

    return NextResponse.json({
      ...result,
      permissionKeys: result.contributorRoleSyncDiff.permissionKeys,
      contributorRoleProvisioningNote: result.contributorRoleProvisioned
        ? null
        : "Die Mandanten-Rolle fehlt — Modul-Vorschau basiert auf der Vorlage, nicht auf persistierten Rechten.",
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Interner Serverfehler.";
    const status = message.includes("FC Allschwil") ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}