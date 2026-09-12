import jpeg from "jpeg-js";
import {
  HEADER_JPG_SOURCE_CROP_X_FRACTION,
  INVOICE_HEADER_JPG_PATH,
} from "./constants";
import { loadBrandingAsset } from "./render-swiss-payment-slip";

export type HeaderJpgCropMeta = {
  sourcePath: string;
  sourceWidthPx: number;
  sourceHeightPx: number;
  cropXPx: number;
  cropYPx: number;
  cropWidthPx: number;
  cropHeightPx: number;
};

/** Deterministic far-right crop of the 16:9 header artwork (SWISS-01E4C). */
export async function loadInvoiceHeaderJpgAccentBytes(): Promise<{
  jpegBytes: Uint8Array;
  crop: HeaderJpgCropMeta;
} | null> {
  const raw = await loadBrandingAsset(INVOICE_HEADER_JPG_PATH);
  if (!raw) {
    return null;
  }

  const decoded = jpeg.decode(raw, { useTArray: true });
  const { width, height, data } = decoded;
  const cropX = Math.min(
    width - 1,
    Math.max(0, Math.floor(width * HEADER_JPG_SOURCE_CROP_X_FRACTION)),
  );
  const cropW = width - cropX;
  const cropH = height;
  const cropped = new Uint8Array(cropW * cropH * 4);

  for (let y = 0; y < cropH; y++) {
    for (let x = 0; x < cropW; x++) {
      const src = (y * width + cropX + x) * 4;
      const dst = (y * cropW + x) * 4;
      cropped[dst] = data[src]!;
      cropped[dst + 1] = data[src + 1]!;
      cropped[dst + 2] = data[src + 2]!;
      cropped[dst + 3] = data[src + 3]!;
    }
  }

  const encoded = jpeg.encode({ width: cropW, height: cropH, data: cropped }, 92);
  return {
    jpegBytes: encoded.data,
    crop: {
      sourcePath: INVOICE_HEADER_JPG_PATH,
      sourceWidthPx: width,
      sourceHeightPx: height,
      cropXPx: cropX,
      cropYPx: 0,
      cropWidthPx: cropW,
      cropHeightPx: cropH,
    },
  };
}
