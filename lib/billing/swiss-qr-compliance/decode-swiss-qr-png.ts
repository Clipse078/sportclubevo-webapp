import jsQR from "jsqr";
import { PNG } from "pngjs";
import { SWISS_QR_COMPLIANCE_CODES } from "./swiss-qr-compliance-codes";
import { SwissQrComplianceError } from "./swiss-qr-compliance-error";
import { rgbBufferToRgba } from "./extract-pdf-embedded-pngs";
import { normalizeSwissQrPayloadForComparison } from "./serialize-canonical-swiss-qr-payload";

export function decodeSwissQrPayloadFromRgba(
  imageData: Uint8ClampedArray,
  width: number,
  height: number,
): string {
  const result = jsQR(imageData, width, height);
  if (!result?.data) {
    throw new SwissQrComplianceError(
      SWISS_QR_COMPLIANCE_CODES.QR_DECODE_FAILED,
      "QR-Code konnte nicht dekodiert werden.",
    );
  }
  return result.data;
}

export function decodeSwissQrPayloadFromPng(pngBuffer: Buffer): string {
  const png = PNG.sync.read(pngBuffer);
  const imageData = new Uint8ClampedArray(png.width * png.height * 4);
  for (let i = 0; i < png.data.length; i++) {
    imageData[i] = png.data[i]!;
  }
  return decodeSwissQrPayloadFromRgba(imageData, png.width, png.height);
}

export function decodeSwissQrPayloadFromRgbSquare(rawRgb: Buffer): string {
  if (rawRgb.length % 3 !== 0) {
    throw new SwissQrComplianceError(
      SWISS_QR_COMPLIANCE_CODES.QR_DECODE_FAILED,
      "Ungültiges RGB-Bildformat.",
    );
  }
  const side = Math.round(Math.sqrt(rawRgb.length / 3));
  if (side * side * 3 !== rawRgb.length) {
    throw new SwissQrComplianceError(
      SWISS_QR_COMPLIANCE_CODES.QR_DECODE_FAILED,
      "QR-Bild ist nicht quadratisch.",
    );
  }
  const rgba = rgbBufferToRgba(rawRgb, side, side);
  return decodeSwissQrPayloadFromRgba(rgba, side, side);
}

export function decodeSwissQrPayloadFromImageBuffer(imageBuffer: Buffer): string {
  if (imageBuffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) {
    return decodeSwissQrPayloadFromPng(imageBuffer);
  }
  return decodeSwissQrPayloadFromRgbSquare(imageBuffer);
}

export function assertDecodedPayloadMatchesCanonical(
  decodedPayload: string,
  canonicalPayload: string,
): void {
  const decoded = normalizeSwissQrPayloadForComparison(decodedPayload);
  const canonical = normalizeSwissQrPayloadForComparison(canonicalPayload);
  if (decoded !== canonical) {
    throw new SwissQrComplianceError(
      SWISS_QR_COMPLIANCE_CODES.QR_PAYLOAD_MISMATCH,
      "Dekodierter QR-Payload stimmt nicht mit dem kanonischen Payload überein.",
    );
  }
}
