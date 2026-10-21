import { describe, expect, it } from "vitest";
import {
  SCE_DESIGN_SYSTEM_10R7_1_ORGANISATION_BUILDER,
  SCE_DESIGN_SYSTEM_10R7_1_PO,
} from "@/lib/design-system/sce-design-system-10r7-1-po-correction-meta";
import { SCE_DESIGN_SYSTEM_10R7_ORGANISATION_BUILDER } from "@/lib/design-system/sce-design-system-10r7-po-correction-meta";

describe("SCE-DESIGN-SYSTEM-10R7.1 Organisation Builder hover preview regression", () => {
  it("marks R7.1 ready for PO review without DS-10 closure", () => {
    expect(SCE_DESIGN_SYSTEM_10R7_1_PO.SCE_DESIGN_SYSTEM_10R7_1_READY_FOR_PO_REVIEW).toBe("YES");
    expect(SCE_DESIGN_SYSTEM_10R7_1_PO.SCE_DESIGN_SYSTEM_10_READY_FOR_CLOSURE).toBe("NO");
    expect(SCE_DESIGN_SYSTEM_10R7_1_PO.PO_DS10_ORG_BUILDER_R7_1_VISUAL_UAT).toBe("PENDING");
  });

  it("preserves R7 people model locks", () => {
    expect(SCE_DESIGN_SYSTEM_10R7_ORGANISATION_BUILDER.ORG_RESPONSIBLE_PEOPLE_SOURCE).toBe(
      "ORG_UNIT_MEMBERSHIP_IS_PRIMARY",
    );
    expect(SCE_DESIGN_SYSTEM_10R7_ORGANISATION_BUILDER.ORG_ALL_ORG_UNIT_PEOPLE_SOURCE).toBe(
      "PERSON_ASSIGNMENT_ACTIVE",
    );
    expect(SCE_DESIGN_SYSTEM_10R7_ORGANISATION_BUILDER.SELECTED_NODE_PREVIEW_DUPLICATION).toBe("NO");
  });

  it("locks restored hover interaction contract", () => {
    expect(SCE_DESIGN_SYSTEM_10R7_1_ORGANISATION_BUILDER.UNSELECTED_NODE_HOVER_PREVIEW).toBe("YES");
    expect(SCE_DESIGN_SYSTEM_10R7_1_ORGANISATION_BUILDER.OTHER_NODE_PREVIEW_WHILE_SELECTION_EXISTS).toBe(
      "YES",
    );
    expect(SCE_DESIGN_SYSTEM_10R7_1_ORGANISATION_BUILDER.EMPTY_DATA_PREVIEW).toBe("YES");
  });
});
