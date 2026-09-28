/**
 * SCE-COMM-EVO-07 — immutable signature snapshot at send/publish time.
 */

import type { Prisma } from "@prisma/client";
import type { PersonalSignatureAssetRef, PersonalSignatureContent } from "@/lib/communication/personal-signature/signature-content-types";
import { PERSONAL_SIGNATURE_CONTENT_VERSION } from "@/lib/communication/personal-signature/signature-content-types";
import {
  isPersonalSignatureContent,
  signatureContentToPlainText,
} from "@/lib/communication/personal-signature/signature-content";

export type PersonalSignatureFreezeSnapshot = {
  version: number;
  contentJson: PersonalSignatureContent;
  plainTextFallback: string;
  assets: PersonalSignatureAssetRef[];
  /** Message body before signature merge (plain). */
  messageBodyText: string;
  contentVersion: number;
};

export function buildPersonalSignatureFreezeSnapshot(input: {
  messageBodyText: string;
  contentJson: PersonalSignatureContent | null;
  legacyPlain: string | null;
  assets: PersonalSignatureAssetRef[];
  contentVersion: number;
}): PersonalSignatureFreezeSnapshot | null {
  const signaturePlain =
    input.contentJson != null
      ? signatureContentToPlainText(input.contentJson)
      : input.legacyPlain?.trim() ?? "";
  if (!signaturePlain && input.assets.length === 0) {
    return null;
  }
  const contentJson =
    input.contentJson ??
    ({
      type: "doc",
      version: PERSONAL_SIGNATURE_CONTENT_VERSION,
      content: signaturePlain
        ? signaturePlain.split("\n").map((line) => ({
            type: "paragraph" as const,
            content: line ? [{ type: "text" as const, text: line }] : [],
          }))
        : [{ type: "paragraph" as const }],
    } as PersonalSignatureContent);

  return {
    version: 1,
    contentJson,
    plainTextFallback: signaturePlain,
    assets: input.assets,
    messageBodyText: input.messageBodyText.replace(/\r\n/g, "\n").replace(/\n+$/, ""),
    contentVersion: input.contentVersion,
  };
}

export function parsePersonalSignatureFreezeJson(
  raw: unknown,
): PersonalSignatureFreezeSnapshot | null {
  if (!raw || typeof raw !== "object") return null;
  const obj = raw as Record<string, unknown>;
  if (!isPersonalSignatureContent(obj.contentJson)) return null;
  const assets = Array.isArray(obj.assets) ? (obj.assets as PersonalSignatureAssetRef[]) : [];
  const messageBodyText = typeof obj.messageBodyText === "string" ? obj.messageBodyText : "";
  const plainTextFallback =
    typeof obj.plainTextFallback === "string"
      ? obj.plainTextFallback
      : signatureContentToPlainText(obj.contentJson);
  return {
    version: typeof obj.version === "number" ? obj.version : 1,
    contentJson: obj.contentJson,
    plainTextFallback,
    assets,
    messageBodyText,
    contentVersion: typeof obj.contentVersion === "number" ? obj.contentVersion : 1,
  };
}

export function personalSignatureFreezeToJson(
  freeze: PersonalSignatureFreezeSnapshot,
): Prisma.InputJsonValue {
  return freeze as unknown as Prisma.InputJsonValue;
}
