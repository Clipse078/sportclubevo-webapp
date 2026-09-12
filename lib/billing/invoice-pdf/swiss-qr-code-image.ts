import QRCode from "qrcode";

/** SIX Swiss QR-bill: QR type 11, error correction M, quiet zone per module width. */
export async function renderSwissQrCodePng(spcPayload: string, pixelSize: number): Promise<Buffer> {
  return QRCode.toBuffer(spcPayload, {
    errorCorrectionLevel: "M",
    type: "png",
    margin: 4,
    width: pixelSize,
    color: {
      dark: "#000000",
      light: "#ffffff",
    },
  });
}

export const SWISS_QR_RENDER_PIXEL_SIZE = 992;
