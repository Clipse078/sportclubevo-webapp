import { inflateSync } from "node:zlib";

const PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
const PNG_IEND = Buffer.from("IEND");

function tryExtractPngAt(buffer: Buffer, start: number): Buffer | null {
  if (start + PNG_SIGNATURE.length > buffer.length) {
    return null;
  }
  if (!buffer.subarray(start, start + PNG_SIGNATURE.length).equals(PNG_SIGNATURE)) {
    return null;
  }
  const iendIndex = buffer.indexOf(PNG_IEND, start);
  if (iendIndex === -1) {
    return null;
  }
  const end = iendIndex + PNG_IEND.length + 4;
  if (end > buffer.length) {
    return null;
  }
  return Buffer.from(buffer.subarray(start, end));
}

function collectPngsFromBuffer(buffer: Buffer, into: Buffer[]): void {
  let offset = 0;
  while (offset < buffer.length) {
    const idx = buffer.indexOf(PNG_SIGNATURE, offset);
    if (idx === -1) {
      break;
    }
    const png = tryExtractPngAt(buffer, idx);
    if (png) {
      into.push(png);
      offset = idx + png.length;
    } else {
      offset = idx + 1;
    }
  }
}

function decodePdfStreams(pdfBytes: Buffer): Buffer[] {
  const decoded: Buffer[] = [];
  const streamToken = Buffer.from("stream\r\n");
  const streamTokenLf = Buffer.from("stream\n");
  let searchFrom = 0;
  while (searchFrom < pdfBytes.length) {
    let start = pdfBytes.indexOf(streamToken, searchFrom);
    let headerLen = streamToken.length;
    if (start === -1) {
      start = pdfBytes.indexOf(streamTokenLf, searchFrom);
      headerLen = streamTokenLf.length;
    }
    if (start === -1) {
      break;
    }
    const dataStart = start + headerLen;
    const end = pdfBytes.indexOf(Buffer.from("endstream"), dataStart);
    if (end === -1) {
      break;
    }
    const raw = pdfBytes.subarray(dataStart, end);
    try {
      decoded.push(inflateSync(raw));
    } catch {
      decoded.push(Buffer.from(raw));
    }
    searchFrom = end + 9;
  }
  return decoded;
}

function isSquareQrDimension(size: number): boolean {
  return size >= 400 && size <= 1200;
}

/** pdf-lib embeds PNGs as FlateDecode DeviceRGB raw samples (no PNG wrapper). */
export function extractPdfEmbeddedRgbQrCandidates(pdfBytes: Uint8Array): Buffer[] {
  const streams = decodePdfStreams(Buffer.from(pdfBytes));
  const candidates: Buffer[] = [];
  for (const stream of streams) {
    if (stream.length % 3 !== 0) {
      continue;
    }
    const pixels = stream.length / 3;
    const side = Math.round(Math.sqrt(pixels));
    if (side * side * 3 !== stream.length || !isSquareQrDimension(side)) {
      continue;
    }
    candidates.push(stream);
  }
  return candidates.sort((a, b) => b.length - a.length);
}

/** Extracts PNG images when present (uncompressed) or RGB QR candidates from pdf-lib PDFs. */
export function extractEmbeddedPngsFromPdf(pdfBytes: Uint8Array): Buffer[] {
  const buffer = Buffer.from(pdfBytes);
  const pngs: Buffer[] = [];
  collectPngsFromBuffer(buffer, pngs);
  for (const stream of decodePdfStreams(buffer)) {
    collectPngsFromBuffer(stream, pngs);
  }
  if (pngs.length > 0) {
    return pngs;
  }
  return extractPdfEmbeddedRgbQrCandidates(pdfBytes);
}

export function rgbBufferToRgba(rawRgb: Buffer, width: number, height: number): Uint8ClampedArray {
  const rgba = new Uint8ClampedArray(width * height * 4);
  for (let i = 0, p = 0; i < rawRgb.length; i += 3, p += 4) {
    rgba[p] = rawRgb[i]!;
    rgba[p + 1] = rawRgb[i + 1]!;
    rgba[p + 2] = rawRgb[i + 2]!;
    rgba[p + 3] = 255;
  }
  return rgba;
}
