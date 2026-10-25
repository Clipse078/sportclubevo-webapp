import { readFile } from "node:fs/promises";
import path from "node:path";
import type { PDFDocument, PDFImage, PDFPage } from "pdf-lib";
import { fileTypeFromBuffer } from "file-type";
import { isVercelBlobUrl } from "@/lib/assets/storage";
import { isAllowedLogoUploadMimeType } from "@/lib/assets/validation";
import { loadSportClubEvoFooterLogoAssetBytes } from "@/lib/billing/invoice-pdf/sportclubevo-footer-logo-asset";

const MAX_LOGO_BYTES = 2 * 1024 * 1024;
const LOGO_FETCH_TIMEOUT_MS = 8_000;

export type PublicationPdfImageMime = "image/png" | "image/jpeg";

export type PublicationPdfEmbeddedImage = {
  image: PDFImage;
  widthPt: number;
  heightPt: number;
};

export function fitImageWithinBounds(
  imageWidth: number,
  imageHeight: number,
  maxWidthPt: number,
  maxHeightPt: number,
): { widthPt: number; heightPt: number } {
  if (imageWidth <= 0 || imageHeight <= 0) {
    return { widthPt: 0, heightPt: 0 };
  }
  const scale = Math.min(maxWidthPt / imageWidth, maxHeightPt / imageHeight, 1);
  return {
    widthPt: imageWidth * scale,
    heightPt: imageHeight * scale,
  };
}

export async function embedPublicationPdfImage(
  pdfDoc: PDFDocument,
  bytes: Uint8Array,
  mime: PublicationPdfImageMime,
): Promise<PDFImage | null> {
  try {
    if (mime === "image/jpeg") {
      return pdfDoc.embedJpg(bytes);
    }
    return pdfDoc.embedPng(bytes);
  } catch {
    return null;
  }
}

export function drawPublicationImage(
  page: PDFPage,
  embedded: PublicationPdfEmbeddedImage,
  x: number,
  y: number,
): void {
  if (embedded.widthPt <= 0 || embedded.heightPt <= 0) return;
  page.drawImage(embedded.image, {
    x,
    y,
    width: embedded.widthPt,
    height: embedded.heightPt,
  });
}

export async function loadScePublicationMark(
  pdfDoc: PDFDocument,
  maxWidthPt: number,
  maxHeightPt: number,
): Promise<PublicationPdfEmbeddedImage | null> {
  const bytes = await loadSportClubEvoFooterLogoAssetBytes();
  const embedded = await embedPublicationPdfImage(pdfDoc, bytes, "image/png");
  if (!embedded) return null;
  const { widthPt, heightPt } = fitImageWithinBounds(
    embedded.width,
    embedded.height,
    maxWidthPt,
    maxHeightPt,
  );
  return { image: embedded, widthPt, heightPt };
}

async function readLocalPublicAsset(relativePath: string): Promise<Uint8Array | null> {
  const normalized = relativePath.replace(/^\/+/, "");
  if (normalized.includes("..")) return null;
  try {
    const absolute = path.join(process.cwd(), "public", normalized);
    const buf = await readFile(absolute);
    return new Uint8Array(buf);
  } catch {
    return null;
  }
}

async function fetchTrustedLogoBytes(url: string): Promise<Uint8Array | null> {
  if (!isVercelBlobUrl(url)) return null;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), LOGO_FETCH_TIMEOUT_MS);
  try {
    const response = await fetch(url, {
      signal: controller.signal,
      redirect: "error",
    });
    if (!response.ok) return null;
    const lengthHeader = response.headers.get("content-length");
    if (lengthHeader && Number.parseInt(lengthHeader, 10) > MAX_LOGO_BYTES) {
      return null;
    }
    const buf = new Uint8Array(await response.arrayBuffer());
    if (buf.byteLength === 0 || buf.byteLength > MAX_LOGO_BYTES) return null;
    return buf;
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

export async function loadTenantPublicationLogo(
  logoUrl: string | null | undefined,
): Promise<{ bytes: Uint8Array; mime: PublicationPdfImageMime } | null> {
  const trimmed = logoUrl?.trim();
  if (!trimmed) return null;

  let bytes: Uint8Array | null = null;
  if (trimmed.startsWith("/")) {
    bytes = await readLocalPublicAsset(trimmed);
  } else if (isVercelBlobUrl(trimmed)) {
    bytes = await fetchTrustedLogoBytes(trimmed);
  } else {
    return null;
  }

  if (!bytes) return null;

  const detected = await fileTypeFromBuffer(bytes);
  if (!detected || !isAllowedLogoUploadMimeType(detected.mime)) {
    return null;
  }
  if (detected.mime === "image/png") {
    return { bytes, mime: "image/png" };
  }
  if (detected.mime === "image/jpeg") {
    return { bytes, mime: "image/jpeg" };
  }
  return null;
}
