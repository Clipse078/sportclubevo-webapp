import {
  METADATA_GROUP_COUNT,
  METADATA_GROUP_PITCH_MM,
  METADATA_LABEL_BASELINE_OFFSET_MM,
  METADATA_STACK_TOP_Y_MM,
  METADATA_VALUE_BASELINE_OFFSET_MM,
  METADATA_VALUE_CAP_HEIGHT_MM,
} from "./invoice-design-geometry";

export type MetadataGroupLayoutMm = {
  index: number;
  label: string;
  groupTopYMm: number;
  labelBaselineYMm: number;
  valueBaselineYMm: number;
  labelToValueGapMm: number;
  valueBottomYMm: number;
};

export function planMetadataGroups(): MetadataGroupLayoutMm[] {
  const labels = [
    "Rechnungsdatum",
    "Fällig am",
    "Leistungszeitraum",
    "Zahlungsziel",
  ] as const;

  return labels.map((label, index) => {
    const groupTopYMm = METADATA_STACK_TOP_Y_MM + index * METADATA_GROUP_PITCH_MM;
    const labelBaselineYMm = groupTopYMm + METADATA_LABEL_BASELINE_OFFSET_MM;
    const valueBaselineYMm = groupTopYMm + METADATA_VALUE_BASELINE_OFFSET_MM;
    return {
      index,
      label,
      groupTopYMm,
      labelBaselineYMm,
      valueBaselineYMm,
      labelToValueGapMm: METADATA_VALUE_BASELINE_OFFSET_MM - METADATA_LABEL_BASELINE_OFFSET_MM,
      valueBottomYMm: valueBaselineYMm + METADATA_VALUE_CAP_HEIGHT_MM,
    };
  });
}

export function metadataStackEndYMm(): number {
  const groups = planMetadataGroups();
  const last = groups[groups.length - 1];
  return last?.valueBottomYMm ?? METADATA_STACK_TOP_Y_MM;
}

export function metadataInterGroupGapMm(
  previous: MetadataGroupLayoutMm,
  next: MetadataGroupLayoutMm,
): number {
  return next.labelBaselineYMm - previous.valueBottomYMm;
}

export function metadataStackHeightMm(): number {
  return metadataStackEndYMm() - METADATA_STACK_TOP_Y_MM;
}

export function assertMetadataGroupCount(): number {
  return METADATA_GROUP_COUNT;
}
