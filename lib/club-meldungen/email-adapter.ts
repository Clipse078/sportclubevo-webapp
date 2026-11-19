/**
 * SCE-ANLIEGEN-01 — Email channel adapter (not activated in this release).
 *
 * Safe, testable inbound/outbound contract without live provider wiring.
 */

export type ClubMeldungEmailInboundPayload = {
  tenantKey: string;
  mailboxToken: string;
  messageId: string;
  inReplyTo?: string | null;
  references?: string[];
  fromEmail: string;
  verifiedSenderUserId?: string | null;
  subject: string;
  bodyText: string;
  attachmentStorageKeys?: string[];
  receivedAt: string;
  replayNonce: string;
};

export type ClubMeldungEmailProcessResult =
  | { ok: true; action: "appended_to_case"; meldungId: string; caseNumber: string }
  | { ok: true; action: "rejected_duplicate"; meldungId: string }
  | { ok: false; reason: "unauthenticated_sender" | "unknown_thread" | "replay" | "tenant_mismatch" };

const processedNonces = new Set<string>();

/** Fixture-only replay guard — production would use durable store. */
export function verifyClubMeldungEmailReplay(nonce: string): boolean {
  if (processedNonces.has(nonce)) return false;
  processedNonces.add(nonce);
  return true;
}

/**
 * Resolves a case id from RFC threading headers against synthetic fixtures.
 * Live activation requires mailbox + DNS configuration (documented, not enabled).
 */
export function resolveClubMeldungIdFromEmailThread(input: {
  inReplyTo?: string | null;
  references?: string[];
  syntheticCaseMessageIds: Record<string, string>;
}): string | null {
  const candidates = [input.inReplyTo, ...(input.references ?? [])].filter(Boolean) as string[];
  for (const header of candidates) {
    const meldungId = input.syntheticCaseMessageIds[header];
    if (meldungId) return meldungId;
  }
  return null;
}

export function processClubMeldungInboundEmailFixture(
  payload: ClubMeldungEmailInboundPayload,
  fixtures: {
    tenantKeyToId: Record<string, string>;
    senderUserByEmail: Record<string, string>;
    caseMessageIds: Record<string, string>;
    caseMeta: Record<string, { id: string; caseNumber: string; reporterUserId: string }>;
  },
): ClubMeldungEmailProcessResult {
  if (fixtures.tenantKeyToId[payload.tenantKey] === undefined) {
    return { ok: false, reason: "tenant_mismatch" };
  }
  if (!verifyClubMeldungEmailReplay(payload.replayNonce)) {
    return { ok: false, reason: "replay" };
  }

  const verifiedUserId =
    payload.verifiedSenderUserId ??
    fixtures.senderUserByEmail[payload.fromEmail.toLowerCase()] ??
    null;
  if (!verifiedUserId) {
    return { ok: false, reason: "unauthenticated_sender" };
  }

  const meldungId = resolveClubMeldungIdFromEmailThread({
    inReplyTo: payload.inReplyTo,
    references: payload.references,
    syntheticCaseMessageIds: fixtures.caseMessageIds,
  });
  if (!meldungId || !fixtures.caseMeta[meldungId]) {
    return { ok: false, reason: "unknown_thread" };
  }

  const meta = fixtures.caseMeta[meldungId]!;
  if (meta.reporterUserId !== verifiedUserId) {
    return { ok: false, reason: "unauthenticated_sender" };
  }

  return {
    ok: true,
    action: "appended_to_case",
    meldungId: meta.id,
    caseNumber: meta.caseNumber,
  };
}

export const CLUB_MELDUNG_EMAIL_ACTIVATION_PREREQUISITES = [
  "Tenant mailbox token and inbound route configured in Communication Center",
  "SPF/DKIM aligned sender domain verified for outbound case replies",
  "Role grants: meldungen.submit (reporters), meldungen.handle / meldungen.view_all (handlers)",
  "APPLY_PERMISSION_SYNC against target environment after migration deploy",
] as const;