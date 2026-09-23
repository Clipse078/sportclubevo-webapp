/**
 * WORKSPACE-08-06 — private S3-compatible Workspace storage adapter (Exoscale SOS compatible).
 */

import {
  DeleteObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  PutObjectCommand,
  S3Client,
  type S3ClientConfig,
} from "@aws-sdk/client-s3";
import { Readable } from "node:stream";

import {
  getWorkspaceS3CompatibleConfig,
  type WorkspaceS3CompatibleConfig,
} from "@/lib/workspace/storage/workspace-storage-config";
import {
  isAllowedWorkspaceStorageReference,
  normalizeWorkspaceStorageReference,
} from "@/lib/workspace/storage/storage-locator";
import {
  calculateWorkspaceChecksum,
  getWorkspaceStorageKey,
} from "@/lib/workspace/storage/workspace-storage-key";
import { WORKSPACE_STORAGE_PROVIDER_IDS } from "@/lib/workspace/storage/provider-identity";
import {
  WorkspaceStorageOperationError,
  type WorkspaceStorageErrorClass,
} from "@/lib/workspace/storage/storage-errors";
import type {
  WorkspaceStorageDownloadInput,
  WorkspaceStorageDownloadResult,
  WorkspaceStorageProvider,
  WorkspaceStorageUploadInput,
  WorkspaceStorageUploadResult,
  WorkspaceUploadErrorCode,
} from "@/lib/workspace/upload-types";
import {
  getWorkspaceAttachmentContentDisposition,
  sanitizeWorkspaceFilename,
} from "@/lib/workspace/upload-types";

export const WORKSPACE_S3_COMPATIBLE_PROVIDER_ID =
  WORKSPACE_STORAGE_PROVIDER_IDS.S3_COMPATIBLE;

function makeUploadFailure(
  status: number,
  code: WorkspaceUploadErrorCode,
  error: string,
): WorkspaceStorageUploadResult {
  return { ok: false as const, status, code, error };
}

function classifyS3Error(error: unknown): WorkspaceStorageErrorClass {
  if (!(error instanceof Error)) {
    return "UNKNOWN";
  }
  const name = error.name;
  if (name === "NotFound" || name === "NoSuchKey") {
    return "NOT_FOUND";
  }
  if (name === "AccessDenied") {
    return "ACCESS_DENIED";
  }
  if (name === "InvalidAccessKeyId" || name === "SignatureDoesNotMatch") {
    return "AUTHENTICATION_FAILED";
  }
  if (name === "SlowDown" || name === "Throttling") {
    return "RATE_LIMITED";
  }
  if (name === "RequestTimeout" || name === "TimeoutError") {
    return "TIMEOUT";
  }
  if (name === "PreconditionFailed") {
    return "CONFLICT";
  }
  return "UNKNOWN";
}

function toReadableStream(
  body: unknown,
): ReadableStream<Uint8Array> | null {
  if (!body) {
    return null;
  }
  if (body instanceof ReadableStream) {
    return body;
  }
  if (body instanceof Readable) {
    return Readable.toWeb(body) as ReadableStream<Uint8Array>;
  }
  if (body instanceof Uint8Array) {
    return new ReadableStream({
      start(controller) {
        controller.enqueue(body);
        controller.close();
      },
    });
  }
  return null;
}

export type S3CompatibleWorkspaceStorageDeps = {
  getConfig?: () => WorkspaceS3CompatibleConfig;
  createClient?: (config: WorkspaceS3CompatibleConfig) => S3Client;
};

export class S3CompatibleWorkspaceStorage implements WorkspaceStorageProvider {
  private readonly getConfig: () => WorkspaceS3CompatibleConfig;
  private readonly createClient: (config: WorkspaceS3CompatibleConfig) => S3Client;
  private client: S3Client | null = null;
  private clientFingerprint: string | null = null;

  constructor(deps: S3CompatibleWorkspaceStorageDeps = {}) {
    this.getConfig = deps.getConfig ?? getWorkspaceS3CompatibleConfig;
    this.createClient =
      deps.createClient ??
      ((config) => {
        const clientConfig: S3ClientConfig = {
          region: config.region,
          endpoint: config.endpoint,
          forcePathStyle: config.forcePathStyle,
          credentials: {
            accessKeyId: config.accessKeyId,
            secretAccessKey: config.secretAccessKey,
          },
        };
        return new S3Client(clientConfig);
      });
  }

  private resolveClient(): S3Client {
    const config = this.getConfig();
    const fingerprint = [
      config.endpoint,
      config.region,
      config.bucket,
      config.accessKeyId,
      String(config.forcePathStyle),
    ].join("|");
    if (!this.client || this.clientFingerprint !== fingerprint) {
      this.client = this.createClient(config);
      this.clientFingerprint = fingerprint;
    }
    return this.client;
  }

  async upload(
    input: WorkspaceStorageUploadInput,
  ): Promise<WorkspaceStorageUploadResult> {
    let config: WorkspaceS3CompatibleConfig;
    try {
      config = this.getConfig();
    } catch (error) {
      if (error instanceof WorkspaceStorageOperationError) {
        console.error(
          "[workspace-storage] s3 upload failed: configuration error",
          { errorClass: error.errorClass },
        );
      }
      return makeUploadFailure(
        503,
        "WORKSPACE_UPLOAD_STORAGE_NOT_CONFIGURED",
        "Workspace-Upload ist derzeit nicht verfügbar, weil der Speicher nicht konfiguriert ist.",
      );
    }

    const versionId = input.versionId.trim();
    if (!versionId || input.buffer.byteLength === 0) {
      return makeUploadFailure(
        400,
        "WORKSPACE_UPLOAD_INVALID_FILE",
        "Ungültige Upload-Daten.",
      );
    }

    const filename = sanitizeWorkspaceFilename(input.filename);
    const storageKey = getWorkspaceStorageKey({
      tenantId: input.tenantId,
      documentId: input.documentId,
      versionId,
      filename,
    });

    const checksum = calculateWorkspaceChecksum(input.buffer);
    const client = this.resolveClient();

    try {
      await client.send(
        new HeadObjectCommand({
          Bucket: config.bucket,
          Key: storageKey,
        }),
      );
      return makeUploadFailure(
        409,
        "WORKSPACE_UPLOAD_CONFLICT",
        "Eine Version dieser Datei existiert bereits im Speicher.",
      );
    } catch (headError) {
      const headClass = classifyS3Error(headError);
      if (headClass !== "NOT_FOUND") {
        console.error("[workspace-storage] s3 upload head failed", {
          errorClass: headClass,
        });
      }
    }

    try {
      await client.send(
        new PutObjectCommand({
          Bucket: config.bucket,
          Key: storageKey,
          Body: Buffer.from(input.buffer),
          ContentType: input.mimeType,
          ACL: undefined,
        }),
      );

      return {
        ok: true,
        storageKey,
        storageUrl: null,
        checksum,
        filename,
        mimeType: input.mimeType,
        sizeBytes: input.buffer.byteLength,
      };
    } catch (error) {
      const errorClass = classifyS3Error(error);
      console.error("[workspace-storage] s3 upload failed", { errorClass });

      if (errorClass === "CONFLICT") {
        return makeUploadFailure(
          409,
          "WORKSPACE_UPLOAD_CONFLICT",
          "Eine Version dieser Datei existiert bereits im Speicher.",
        );
      }
      if (errorClass === "RATE_LIMITED") {
        return makeUploadFailure(
          429,
          "WORKSPACE_UPLOAD_STORAGE_FAILED",
          "Zu viele Upload-Anfragen. Bitte versuchen Sie es später erneut.",
        );
      }
      if (
        errorClass === "INVALID_CONFIGURATION" ||
        errorClass === "AUTHENTICATION_FAILED" ||
        errorClass === "ACCESS_DENIED"
      ) {
        return makeUploadFailure(
          503,
          "WORKSPACE_UPLOAD_STORAGE_NOT_CONFIGURED",
          "Workspace-Upload ist derzeit nicht verfügbar, weil der Speicher nicht konfiguriert ist.",
        );
      }

      return makeUploadFailure(
        500,
        "WORKSPACE_UPLOAD_STORAGE_FAILED",
        "Die Datei konnte nicht gespeichert werden.",
      );
    }
  }

  async download(
    input: WorkspaceStorageDownloadInput,
  ): Promise<WorkspaceStorageDownloadResult> {
    let config: WorkspaceS3CompatibleConfig;
    try {
      config = this.getConfig();
    } catch {
      return {
        ok: false,
        status: 503,
        error:
          "Workspace-Download ist derzeit nicht verfügbar, weil der Speicher nicht konfiguriert ist.",
      };
    }

    const storageReference = normalizeWorkspaceStorageReference(
      input.storageReference,
    );

    if (!isAllowedWorkspaceStorageReference(storageReference)) {
      return {
        ok: false,
        status: 400,
        error: "Ungültige Speicherreferenz.",
      };
    }

    const client = this.resolveClient();

    try {
      const result = await client.send(
        new GetObjectCommand({
          Bucket: config.bucket,
          Key: storageReference,
        }),
      );

      const stream = toReadableStream(result.Body);
      if (!stream) {
        return {
          ok: false,
          status: 500,
          error: "Die Datei konnte nicht geladen werden.",
        };
      }

      const sizeBytes =
        typeof result.ContentLength === "number" ? result.ContentLength : 0;

      return {
        ok: true,
        stream,
        filename: sanitizeWorkspaceFilename(input.filename),
        contentType:
          result.ContentType ||
          input.mimeType ||
          "application/octet-stream",
        contentDisposition: getWorkspaceAttachmentContentDisposition(
          input.filename,
        ),
        sizeBytes,
        etag: result.ETag?.replaceAll('"', "") ?? "",
      };
    } catch (error) {
      const errorClass = classifyS3Error(error);
      if (errorClass === "NOT_FOUND") {
        return {
          ok: false,
          status: 404,
          error: "Die Datei wurde im Speicher nicht gefunden.",
        };
      }
      console.error("[workspace-storage] s3 download failed", { errorClass });
      return {
        ok: false,
        status: 500,
        error: "Die Datei konnte nicht geladen werden.",
      };
    }
  }

  async delete(storageReference: string): Promise<void> {
    let config: WorkspaceS3CompatibleConfig;
    try {
      config = this.getConfig();
    } catch (error) {
      throw error instanceof WorkspaceStorageOperationError
        ? error
        : new WorkspaceStorageOperationError(
            "INVALID_CONFIGURATION",
            "S3-compatible storage is not configured.",
          );
    }

    const normalizedReference = normalizeWorkspaceStorageReference(
      storageReference,
    );

    if (!isAllowedWorkspaceStorageReference(normalizedReference)) {
      return;
    }

    const client = this.resolveClient();

    try {
      await client.send(
        new DeleteObjectCommand({
          Bucket: config.bucket,
          Key: normalizedReference,
        }),
      );
    } catch (error) {
      const errorClass = classifyS3Error(error);
      if (errorClass === "NOT_FOUND") {
        return;
      }
      throw new WorkspaceStorageOperationError(
        errorClass === "RATE_LIMITED" ? "RATE_LIMITED" : "PROVIDER_UNAVAILABLE",
        "Storage delete failed.",
      );
    }
  }
}
