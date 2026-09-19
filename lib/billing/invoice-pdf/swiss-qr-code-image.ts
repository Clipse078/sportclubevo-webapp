import QRCode from "qrcode";

/**
 * SIX IG §6.4: printed Swiss QR symbol is 46×46 mm (quiet zone is separate).
 * Generate one PNG pixel per module with no embedded quiet zone; PDF places the
 * bitmap at {@link SWISS_QR_CODE_SIZE_MM} so the symbol matches SIX size.
 */
export const SWISS_QR_SYMBOL_PIXELS_PER_MODULE = 16;

export type SwissQrRenderMetrics = {
  moduleCount: number;
  pixelsPerModule: number;
  pngSizePx: number;
  marginModules: number;
};

/** SIX Swiss QR-bill: QR type 11, error correction M; quiet zone applied in PDF layout. */
export function getSwissQrRenderMetrics(spcPayload: string): SwissQrRenderMetrics {
  const qr = QRCode.create(spcPayload, { errorCorrectionLevel: "M" });
  const moduleCount = qr.modules.size;
  const pixelsPerModule = SWISS_QR_SYMBOL_PIXELS_PER_MODULE;
  return {
    moduleCount,
    pixelsPerModule,
    pngSizePx: moduleCount * pixelsPerModule,
    marginModules: 0,
  };
}

export async function renderSwissQrCodePng(spcPayload: string): Promise<Buffer> {
  const metrics = getSwissQrRenderMetrics(spcPayload);
  return QRCode.toBuffer(spcPayload, {
    errorCorrectionLevel: "M",
    type: "png",
    margin: metrics.marginModules,
    width: metrics.pngSizePx,
    color: {
      dark: "#000000",
      light: "#ffffff",
    },
  });
}

/** @deprecated Use payload-only {@link renderSwissQrCodePng}; pixel width is derived from module count. */
export const SWISS_QR_RENDER_PIXEL_SIZE = 992;
