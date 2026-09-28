/**
 * SCE-COMM-UX-08A — personal communication signature preference (tenant-scoped, user-owned).
 */

import { prisma } from "@/lib/db/prisma";
import { MAX_TEAM_COMMUNICATION_BODY_LENGTH } from "@/lib/communication/team/team-communication-constants";
import { MAX_PERSONAL_SIGNATURE_LENGTH } from "@/lib/communication/personal-signature/personal-signature-constants";
import {
  composeMessageBodyWithPersonalSignature,
} from "@/lib/communication/personal-signature/personal-signature-compose";

export type PersonalSignaturePreferenceSnapshot = {
  bodyText: string | null;
  useByDefault: boolean;
  hasStoredPreference: boolean;
};

export type PersonalSignatureWriteResult =
  | { ok: true; preference: PersonalSignaturePreferenceSnapshot }
  | { ok: false; code: string; message: string };

function defaultPreference(): PersonalSignaturePreferenceSnapshot {
  return {
    bodyText: null,
    useByDefault: true,
    hasStoredPreference: false,
  };
}

function stripUnsafeMarkup(input: string): string {
  return input.replace(/<[^>]*>/g, "").replace(/\0/g, "");
}

export function sanitizePersonalSignatureBody(body: unknown): string | null {
  if (body === null || body === undefined) return null;
  const normalized = stripUnsafeMarkup(String(body)).replace(/\r\n/g, "\n").trim();
  if (!normalized) return null;
  if (normalized.length > MAX_PERSONAL_SIGNATURE_LENGTH) {
    throw new Error("SIGNATURE_TOO_LONG");
  }
  return normalized;
}

function mapRow(row: {
  bodyText: string | null;
  useByDefault: boolean;
}): PersonalSignaturePreferenceSnapshot {
  return {
    bodyText: row.bodyText?.trim() || null,
    useByDefault: row.useByDefault,
    hasStoredPreference: true,
  };
}

export async function loadPersonalSignaturePreference(
  tenantId: string,
  userId: string,
): Promise<PersonalSignaturePreferenceSnapshot> {
  const row = await prisma.userCommunicationPersonalSignature.findUnique({
    where: { tenantId_userId: { tenantId, userId } },
    select: { bodyText: true, useByDefault: true },
  });
  if (!row) return defaultPreference();
  return mapRow(row);
}

export async function savePersonalSignaturePreference(
  tenantId: string,
  userId: string,
  input: { bodyText?: unknown; useByDefault?: unknown },
): Promise<PersonalSignatureWriteResult> {
  let bodyText: string | null | undefined;
  if (input.bodyText !== undefined) {
    try {
      bodyText = sanitizePersonalSignatureBody(input.bodyText);
    } catch {
      return {
        ok: false,
        code: "SIGNATURE_TOO_LONG",
        message: `Signatur darf maximal ${MAX_PERSONAL_SIGNATURE_LENGTH} Zeichen haben.`,
      };
    }
  }

  const existing = await loadPersonalSignaturePreference(tenantId, userId);
  const useByDefault =
    input.useByDefault === undefined
      ? existing.useByDefault
      : input.useByDefault === true;

  const nextBody =
    bodyText !== undefined ? bodyText : existing.bodyText;

  const row = await prisma.userCommunicationPersonalSignature.upsert({
    where: { tenantId_userId: { tenantId, userId } },
    create: {
      tenantId,
      userId,
      bodyText: nextBody,
      useByDefault,
    },
    update: {
      ...(bodyText !== undefined ? { bodyText: nextBody } : {}),
      useByDefault,
    },
    select: { bodyText: true, useByDefault: true },
  });

  return { ok: true, preference: mapRow(row) };
}

export async function resetPersonalSignaturePreference(
  tenantId: string,
  userId: string,
): Promise<PersonalSignaturePreferenceSnapshot> {
  await prisma.userCommunicationPersonalSignature.deleteMany({
    where: { tenantId, userId },
  });
  return defaultPreference();
}

export function resolveIncludePersonalSignature(
  explicit: boolean | undefined | null,
  preference: PersonalSignaturePreferenceSnapshot,
): boolean {
  if (!preference.bodyText?.trim()) return false;
  if (explicit === true) return true;
  if (explicit === false) return false;
  return preference.useByDefault;
}

export async function applyPersonalSignatureToOutboundBody(input: {
  tenantId: string;
  userId: string;
  messageBody: string;
  includePersonalSignature?: boolean | null;
}): Promise<string> {
  const preference = await loadPersonalSignaturePreference(input.tenantId, input.userId);
  const include = resolveIncludePersonalSignature(
    input.includePersonalSignature,
    preference,
  );
  if (!include) {
    return input.messageBody.replace(/\r\n/g, "\n").trim();
  }
  const combined = composeMessageBodyWithPersonalSignature(
    input.messageBody,
    preference.bodyText,
  );
  if (combined.length > MAX_TEAM_COMMUNICATION_BODY_LENGTH) {
    throw new Error("BODY_WITH_SIGNATURE_TOO_LONG");
  }
  return combined.trim();
}

/** Mitteilungen: personal signature only for MESSAGE kind (not org broadcasts). */
export function personalSignatureSupportedForMitteilungKind(kind: string): boolean {
  return kind === "MESSAGE";
}
