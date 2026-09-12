/**
 * Deterministic address-block baselines (page-top Y, mm downward).
 * Shared by creative layout planning and PDF rendering.
 */

import { ADDRESS_SECTION_LABEL_STEP_MM } from "./invoice-design-geometry";
import {
  fontAscentMm,
  fontDescentMm,
  gapBetweenInkMm,
  inkExtentsFromBaselineMm,
} from "./invoice-font-metrics";

export const ADDRESS_SECTION_LABEL_FONT_PT = 8.5;
export const ADDRESS_RECIPIENT_BODY_FONT_PT = 10;
export const ADDRESS_ISSUER_BODY_FONT_PT = 10;

/** Minimum clear gap between ink boxes of consecutive address lines. */
export const ADDRESS_MIN_INTERLINE_INK_GAP_MM = 0.45;

/** Smallest issuer body size before layout is considered infeasible. */
export const ADDRESS_ISSUER_BODY_FONT_PT_MIN = 8.5;

const ISSUER_FONT_CANDIDATES_PT = [10, 9.5, 9, 8.5] as const;

export function minimumAddressBaselineStepMm(
  fontSizePt: number,
  inkGapMm: number = ADDRESS_MIN_INTERLINE_INK_GAP_MM,
): number {
  return fontAscentMm(fontSizePt) + fontDescentMm(fontSizePt) + inkGapMm;
}

export function addressLabelInkBottomYm(labelBaselineYm: number): number {
  return inkExtentsFromBaselineMm(labelBaselineYm, ADDRESS_SECTION_LABEL_FONT_PT).bottomYMm;
}

/**
 * First shared body baseline below section labels (recipient + issuer columns).
 */
export function addressSharedBodyTopBaselineYm(
  labelBaselineYm: number,
  labelToBodyGapMm: number = ADDRESS_SECTION_LABEL_STEP_MM,
  bodyFontPt: number = ADDRESS_ISSUER_BODY_FONT_PT_MIN,
): number {
  const inkSafeBaseline =
    addressLabelInkBottomYm(labelBaselineYm) +
    ADDRESS_MIN_INTERLINE_INK_GAP_MM +
    fontAscentMm(bodyFontPt);
  const stepBaseline = labelBaselineYm + labelToBodyGapMm;
  return Math.max(stepBaseline, inkSafeBaseline);
}

export function buildAddressLineBaselinesYm(
  firstBaselineYm: number,
  lineCount: number,
  baselineStepMm: number,
): number[] {
  if (lineCount <= 0) {
    return [];
  }
  const baselines: number[] = [];
  for (let index = 0; index < lineCount; index++) {
    baselines.push(firstBaselineYm + index * baselineStepMm);
  }
  return baselines;
}

export function addressInkBottomFromBaselinesYm(
  baselinesYMm: number[],
  fontSizePt: number,
): number {
  if (baselinesYMm.length === 0) {
    return 0;
  }
  const last = baselinesYMm[baselinesYMm.length - 1]!;
  return last + fontDescentMm(fontSizePt);
}

export type PlannedAddressColumnLayout = {
  fontSizePt: number;
  baselineStepMm: number;
  baselinesYMm: number[];
  inkBottomYMm: number;
};

export type PlannedAddressBlockLayout = {
  labelBaselineYMm: number;
  labelToBodyGapMm: number;
  sharedBodyFirstBaselineYMm: number;
  recipient: PlannedAddressColumnLayout;
  issuer: PlannedAddressColumnLayout;
  sectionInkBottomYMm: number;
};

export function assertAddressBaselinesReadable(column: PlannedAddressColumnLayout): void {
  const minStep = minimumAddressBaselineStepMm(column.fontSizePt);
  if (column.baselineStepMm + 0.01 < minStep) {
    throw new Error(
      `Address column baseline step ${column.baselineStepMm} < readable minimum ${minStep} for ${column.fontSizePt}pt`,
    );
  }
  for (let index = 1; index < column.baselinesYMm.length; index++) {
    const upper = inkExtentsFromBaselineMm(column.baselinesYMm[index - 1]!, column.fontSizePt);
    const lower = inkExtentsFromBaselineMm(column.baselinesYMm[index]!, column.fontSizePt);
    const inkGap = gapBetweenInkMm(upper.bottomYMm, lower.topYMm);
    if (inkGap + 0.01 < ADDRESS_MIN_INTERLINE_INK_GAP_MM) {
      throw new Error(`Address line ink collision at index ${index} (gap ${inkGap} mm)`);
    }
  }
}

export function planAddressBlockLayout(input: {
  labelBaselineYm: number;
  labelToBodyGapMm: number;
  recipientLineCount: number;
  issuerLineCount: number;
  maxIssuerInkBottomYm: number;
}): PlannedAddressBlockLayout {
  const sharedBodyFirstBaselineYMm = addressSharedBodyTopBaselineYm(
    input.labelBaselineYm,
    input.labelToBodyGapMm,
    ADDRESS_ISSUER_BODY_FONT_PT_MIN,
  );

  const issuerLineCount = input.issuerLineCount;
  let bodyFontPt: number = ADDRESS_ISSUER_BODY_FONT_PT_MIN;
  let bodyStepMm = minimumAddressBaselineStepMm(ADDRESS_ISSUER_BODY_FONT_PT_MIN);
  let issuerBaselines: number[] = [];

  if (issuerLineCount > 0) {
    for (const candidatePt of ISSUER_FONT_CANDIDATES_PT) {
      const minStep = minimumAddressBaselineStepMm(candidatePt);
      const stepMm =
        issuerLineCount <= 1
          ? minStep
          : (input.maxIssuerInkBottomYm -
              fontDescentMm(candidatePt) -
              sharedBodyFirstBaselineYMm) /
            (issuerLineCount - 1);
      if (stepMm + 0.01 >= minStep) {
        bodyFontPt = candidatePt;
        bodyStepMm = stepMm;
        issuerBaselines = buildAddressLineBaselinesYm(
          sharedBodyFirstBaselineYMm,
          issuerLineCount,
          bodyStepMm,
        );
        break;
      }
    }

    if (issuerBaselines.length === 0) {
      bodyFontPt = ADDRESS_ISSUER_BODY_FONT_PT_MIN;
      bodyStepMm = minimumAddressBaselineStepMm(ADDRESS_ISSUER_BODY_FONT_PT_MIN);
      issuerBaselines = buildAddressLineBaselinesYm(
        sharedBodyFirstBaselineYMm,
        issuerLineCount,
        bodyStepMm,
      );
    }
  }

  const issuer: PlannedAddressColumnLayout = {
    fontSizePt: bodyFontPt,
    baselineStepMm: bodyStepMm,
    baselinesYMm: issuerBaselines,
    inkBottomYMm: addressInkBottomFromBaselinesYm(issuerBaselines, bodyFontPt),
  };

  const recipientBaselines = buildAddressLineBaselinesYm(
    sharedBodyFirstBaselineYMm,
    input.recipientLineCount,
    bodyStepMm,
  );
  const recipient: PlannedAddressColumnLayout = {
    fontSizePt: bodyFontPt,
    baselineStepMm: bodyStepMm,
    baselinesYMm: recipientBaselines,
    inkBottomYMm: addressInkBottomFromBaselinesYm(recipientBaselines, bodyFontPt),
  };

  assertAddressBaselinesReadable(recipient);
  assertAddressBaselinesReadable(issuer);

  const sectionInkBottomYMm = Math.max(recipient.inkBottomYMm, issuer.inkBottomYMm);

  return {
    labelBaselineYMm: input.labelBaselineYm,
    labelToBodyGapMm: input.labelToBodyGapMm,
    sharedBodyFirstBaselineYMm,
    recipient,
    issuer,
    sectionInkBottomYMm,
  };
}
