import { describe, expect, it } from "vitest";
import {
  ADDRESS_SECTION_TOP_Y_MM,
  METADATA_GROUP_PITCH_MM,
  METADATA_LABEL_BASELINE_OFFSET_MM,
  METADATA_MIN_INTER_GROUP_GAP_MM,
  METADATA_STACK_TOP_Y_MM,
  METADATA_VALUE_BASELINE_OFFSET_MM,
} from "../invoice-design-geometry";
import {
  metadataInterGroupGapMm,
  metadataStackEndYMm,
  planMetadataGroups,
} from "../invoice-metadata-layout";

describe("invoice metadata spacing (SWISS-01E4C2)", () => {
  it("uses editorial label/value offsets within target range", () => {
    const labelToValue =
      METADATA_VALUE_BASELINE_OFFSET_MM - METADATA_LABEL_BASELINE_OFFSET_MM;
    expect(labelToValue).toBeGreaterThanOrEqual(1.8);
    expect(labelToValue).toBeLessThanOrEqual(2.2);
  });

  it("plans four non-overlapping metadata groups with minimum inter-group gaps", () => {
    const groups = planMetadataGroups();
    expect(groups).toHaveLength(4);

    for (const group of groups) {
      expect(group.labelToValueGapMm).toBeGreaterThanOrEqual(1.8);
      expect(group.labelToValueGapMm).toBeLessThanOrEqual(2.2);
    }

    for (let index = 1; index < groups.length; index++) {
      const gap = metadataInterGroupGapMm(groups[index - 1]!, groups[index]!);
      expect(gap).toBeGreaterThanOrEqual(METADATA_MIN_INTER_GROUP_GAP_MM);
    }
  });

  it("keeps metadata stack separated from address section", () => {
    expect(metadataStackEndYMm()).toBeLessThanOrEqual(ADDRESS_SECTION_TOP_Y_MM - 3);
    expect(METADATA_STACK_TOP_Y_MM + METADATA_GROUP_PITCH_MM * 3).toBeLessThan(
      ADDRESS_SECTION_TOP_Y_MM,
    );
  });
});
