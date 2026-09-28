/**
 * SCE-COMM-UX-08A + SCE-COMM-EVO-07 — personal communication signature preference.
 */

import { prisma } from "@/lib/db/prisma";
import { Prisma } from "@prisma/client";
import { MAX_TEAM_COMMUNICATION_BODY_LENGTH } from "@/lib/communication/team/team-communication-constants";
import { MAX_PERSONAL_SIGNATURE_LENGTH } from "@/lib/communication/personal-signature/personal-signature-constants";
import {
  composeMessageBodyWithPersonalSignature,
} from "@/lib/communication/personal-signature/personal-signature-compose";
import type { PersonalSignatureContent } from "@/lib/communication/personal-signature/signature-content-types";
import {
  coerceEditorDocToSignatureContent,
  extractSignatureAssetRefs,
  isPersonalSignatureContent,
  plainTextToSignatureContent,
  signatureContentToPlainText,
  PersonalSignatureContentError,
} from "@/lib/communication/personal-signature/signature-content";
import {
  buildPersonalSignatureFreezeSnapshot,
  type PersonalSignatureFreezeSnapshot,
  personalSignatureFreezeToJson,
} from "@/lib/communication/personal-signature/personal-signature-freeze";
import { assertSignatureImageOwnedByUser } from "@/lib/communication/personal-signature/personal-signature-image-service";

export type PersonalSignaturePreferenceSnapshot = {
  bodyText: string | null;
  contentJson: PersonalSignatureContent | null;
  contentVersion: number;
  useByDefault: boolean;
  hasStoredPreference: boolean;
};

export type PersonalSignatureWriteResult =
  | { ok: true; preference: PersonalSignaturePreferenceSnapshot }
  | { ok: false; code: string; message: string };

export type PersonalSignatureApplyResult = {
  bodyText: string;
  freeze: PersonalSignatureFreezeSnapshot | null;
};

function defaultPreference(): PersonalSignaturePreferenceSnapshot {
  return {
    bodyText: null,
    contentJson: null,
    contentVersion: 1,
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
  contentJson: unknown;
  contentVersion: number;
  useByDefault: boolean;
}): PersonalSignaturePreferenceSnapshot {
  const contentJson = isPersonalSignatureContent(row.contentJson)
    ? row.contentJson
    : row.bodyText?.trim()
      ? plainTextToSignatureContent(row.bodyText)
      : null;
  const bodyText =
    row.bodyText?.trim() ||
    (contentJson ? signatureContentToPlainText(contentJson) : null);
  return {
    bodyText,
    contentJson,
    contentVersion: row.contentVersion,
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
    select: {
      bodyText: true,
      contentJson: true,
      contentVersion: true,
      useByDefault: true,
    },
  });
  if (!row) return defaultPreference();
  return mapRow(row);
}

async function syncSignatureAssets(input: {
  tenantId: string;
  userId: string;
  signatureId: string;
  contentJson: PersonalSignatureContent;
}) {
  const refs = extractSignatureAssetRefs(input.contentJson);
  for (const ref of refs) {
    const owned = await assertSignatureImageOwnedByUser({
      tenantId: input.tenantId,
      userId: input.userId,
      attachmentId: ref.attachmentId,
    });
    if (!owned) {
      throw new PersonalSignatureContentError(
        "FORGED_ASSET",
        "Logo-Referenz ist ungültig oder gehört nicht zu Ihnen.",
      );
    }
  }
  await prisma.userCommunicationPersonalSignatureAsset.deleteMany({
    where: { signatureId: input.signatureId },
  });
  if (refs.length > 0) {
    await prisma.userCommunicationPersonalSignatureAsset.createMany({
      data: refs.map((ref) => ({
        tenantId: input.tenantId,
        signatureId: input.signatureId,
        attachmentId: ref.attachmentId,
        sortOrder: ref.sortOrder,
        altText: ref.altText,
        cidKey: ref.cidKey,
      })),
    });
  }
}

export async function savePersonalSignaturePreference(
  tenantId: string,
  userId: string,
  input: { bodyText?: unknown; contentJson?: unknown; useByDefault?: unknown },
): Promise<PersonalSignatureWriteResult> {
  let bodyText: string | null | undefined;
  let contentJson: PersonalSignatureContent | null | undefined;

  if (input.contentJson !== undefined) {
    if (input.contentJson === null) {
      contentJson = null;
      bodyText = null;
    } else {
      try {
        contentJson = coerceEditorDocToSignatureContent(input.contentJson);
        bodyText = signatureContentToPlainText(contentJson);
        if (!bodyText && extractSignatureAssetRefs(contentJson).length === 0) {
          bodyText = null;
          contentJson = null;
        }
      } catch (error) {
        if (error instanceof PersonalSignatureContentError) {
          return { ok: false, code: error.code, message: error.message };
        }
        return { ok: false, code: "MALFORMED_JSON", message: "Signaturformat ungültig." };
      }
    }
  } else if (input.bodyText !== undefined) {
    try {
      bodyText = sanitizePersonalSignatureBody(input.bodyText);
      contentJson = bodyText ? plainTextToSignatureContent(bodyText) : null;
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

  const nextBody = bodyText !== undefined ? bodyText : existing.bodyText;
  const nextContent =
    contentJson !== undefined ? contentJson : existing.contentJson;
  const nextVersion =
    contentJson !== undefined && nextContent
      ? existing.contentVersion + (existing.hasStoredPreference ? 1 : 0)
      : existing.contentVersion;

  const row = await prisma.userCommunicationPersonalSignature.upsert({
    where: { tenantId_userId: { tenantId, userId } },
    create: {
      tenantId,
      userId,
      bodyText: nextBody,
      contentJson: nextContent ? (nextContent as unknown as Prisma.InputJsonValue) : undefined,
      contentVersion: nextContent ? 1 : 1,
      useByDefault,
    },
    update: {
      ...(bodyText !== undefined ? { bodyText: nextBody } : {}),
      ...(contentJson !== undefined
        ? {
            contentJson: nextContent
              ? (nextContent as unknown as Prisma.InputJsonValue)
              : (Prisma.DbNull as unknown as Prisma.InputJsonValue),
            contentVersion: nextVersion,
          }
        : {}),
      useByDefault,
    },
    select: {
      id: true,
      bodyText: true,
      contentJson: true,
      contentVersion: true,
      useByDefault: true,
    },
  });

  if (nextContent) {
    try {
      await syncSignatureAssets({
        tenantId,
        userId,
        signatureId: row.id,
        contentJson: nextContent,
      });
    } catch (error) {
      if (error instanceof PersonalSignatureContentError) {
        return { ok: false, code: error.code, message: error.message };
      }
      throw error;
    }
  } else {
    await prisma.userCommunicationPersonalSignatureAsset.deleteMany({
      where: { signatureId: row.id },
    });
  }

  return { ok: true, preference: mapRow(row) };
}

export async function resetPersonalSignaturePreference(
  tenantId: string,
  userId: string,
): Promise<PersonalSignaturePreferenceSnapshot> {
  const existing = await prisma.userCommunicationPersonalSignature.findUnique({
    where: { tenantId_userId: { tenantId, userId } },
    select: { id: true },
  });
  if (existing) {
    await prisma.userCommunicationPersonalSignatureAsset.deleteMany({
      where: { signatureId: existing.id },
    });
  }
  await prisma.userCommunicationPersonalSignature.deleteMany({
    where: { tenantId, userId },
  });
  return defaultPreference();
}

export function resolveIncludePersonalSignature(
  explicit: boolean | undefined | null,
  preference: PersonalSignaturePreferenceSnapshot,
): boolean {
  const hasContent =
    Boolean(preference.bodyText?.trim()) ||
    Boolean(preference.contentJson && signatureContentToPlainText(preference.contentJson));
  if (!hasContent) return false;
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
  const result = await applyPersonalSignatureToOutbound(input);
  return result.bodyText;
}

export async function applyPersonalSignatureToOutbound(input: {
  tenantId: string;
  userId: string;
  messageBody: string;
  includePersonalSignature?: boolean | null;
}): Promise<PersonalSignatureApplyResult> {
  const preference = await loadPersonalSignaturePreference(input.tenantId, input.userId);
  const include = resolveIncludePersonalSignature(
    input.includePersonalSignature,
    preference,
  );
  const messageBodyText = input.messageBody.replace(/\r\n/g, "\n").trim();
  if (!include) {
    return { bodyText: messageBodyText, freeze: null };
  }

  const signaturePlain =
    preference.contentJson != null
      ? signatureContentToPlainText(preference.contentJson)
      : preference.bodyText;

  const assets =
    preference.contentJson != null
      ? extractSignatureAssetRefs(preference.contentJson)
      : [];

  const combined = composeMessageBodyWithPersonalSignature(messageBodyText, signaturePlain);
  if (combined.length > MAX_TEAM_COMMUNICATION_BODY_LENGTH) {
    throw new Error("BODY_WITH_SIGNATURE_TOO_LONG");
  }

  const freeze = buildPersonalSignatureFreezeSnapshot({
    messageBodyText,
    contentJson: preference.contentJson,
    legacyPlain: preference.bodyText,
    assets,
    contentVersion: preference.contentVersion,
  });

  return {
    bodyText: combined.trim(),
    freeze,
  };
}

export function personalSignatureFreezeJson(
  freeze: PersonalSignatureFreezeSnapshot | null,
): Prisma.InputJsonValue | typeof Prisma.DbNull | undefined {
  if (!freeze) return undefined;
  return personalSignatureFreezeToJson(freeze);
}

/** Mitteilungen: personal signature only for MESSAGE kind (not org broadcasts). */
export function personalSignatureSupportedForMitteilungKind(kind: string): boolean {
  return kind === "MESSAGE";
}
