/**
 * SCE-COMM-EVO-07 — conservative validation for signature logo uploads.
 */

import { fileTypeFromBuffer } from "file-type";
import { sanitizeWorkspaceFilename } from "@/lib/workspace/upload-types";

export const MAX_PERSONAL_SIGNATURE_IMAGE_BYTES = 512 * 1024;

const ALLOWED_IMAGE_MIME = {
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  webp: "image/webp",
  gif: "image/gif",
} as const;

export type ValidatedSignatureImage = {
  originalFilename: string;
  sanitizedFilename: string;
  contentType: (typeof ALLOWED_IMAGE_MIME)[keyof typeof ALLOWED_IMAGE_MIME];
  sizeBytes: number;
};

export class SignatureImageValidationError extends Error {
  constructor(
    readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = "SignatureImageValidationError";
  }
}

function extension(filename: string): string {
  const i = filename.lastIndexOf(".");
  return i > -1 ? filename.slice(i + 1).toLowerCase() : "";
}

export async function validatePersonalSignatureImage(input: {
  filename: string;
  declaredContentType: string;
  buffer: Uint8Array;
}): Promise<ValidatedSignatureImage> {
  const originalFilename = input.filename.trim();
  const sanitizedFilename = sanitizeWorkspaceFilename(originalFilename);
  if (!originalFilename || !sanitizedFilename.includes(".")) {
    throw new SignatureImageValidationError(
      "INVALID_FILENAME",
      "Ein Dateiname mit erlaubter Endung ist erforderlich.",
    );
  }
  if (input.buffer.byteLength === 0) {
    throw new SignatureImageValidationError("EMPTY_FILE", "Die Datei ist leer.");
  }
  if (input.buffer.byteLength > MAX_PERSONAL_SIGNATURE_IMAGE_BYTES) {
    throw new SignatureImageValidationError(
      "FILE_TOO_LARGE",
      "Das Signatur-Logo darf maximal 512 KiB gross sein.",
    );
  }

  const ext = extension(sanitizedFilename);
  const extMime = ALLOWED_IMAGE_MIME[ext as keyof typeof ALLOWED_IMAGE_MIME];
  if (!extMime) {
    throw new SignatureImageValidationError(
      "TYPE_NOT_ALLOWED",
      "Erlaubt sind PNG, JPEG, WEBP und GIF.",
    );
  }

  const detected = await fileTypeFromBuffer(input.buffer);
  if (!detected || detected.mime !== extMime) {
    throw new SignatureImageValidationError(
      "CONTENT_TYPE_MISMATCH",
      "Dateiinhalt stimmt nicht mit der Dateiendung überein.",
    );
  }
  if (input.declaredContentType && input.declaredContentType !== detected.mime) {
    throw new SignatureImageValidationError(
      "CONTENT_TYPE_MISMATCH",
      "Der angegebene Dateityp ist ungültig.",
    );
  }

  return {
    originalFilename,
    sanitizedFilename,
    contentType: detected.mime as ValidatedSignatureImage["contentType"],
    sizeBytes: input.buffer.byteLength,
  };
}
