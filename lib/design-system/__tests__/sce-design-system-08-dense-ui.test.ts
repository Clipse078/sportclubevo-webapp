import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  SCE_DESIGN_SYSTEM_08_CANONICAL_DENSE_PRIMITIVES,
  SCE_DESIGN_SYSTEM_08_DENSE_UI_AUDIT,
  SCE_DESIGN_SYSTEM_08_DENSE_UI_INVENTORY,
  SCE_DESIGN_SYSTEM_08_DOC_MARKERS,
  SCE_DESIGN_SYSTEM_08_GOVERNANCE,
  SCE_DESIGN_SYSTEM_08_DS09_HANDOFF,
  SCE_DESIGN_SYSTEM_08_DS09_HANDOFF_DEBT,
  SCE_DESIGN_SYSTEM_08_PACKAGE_KEY,
  SCE_DESIGN_SYSTEM_08_PO_CLOSURE,
  SCE_DESIGN_SYSTEM_08_PO_FLAGS,
  SCE_DESIGN_SYSTEM_08_PO_REVIEW,
  SCE_DESIGN_SYSTEM_08_REPRESENTATIVE_ADOPTION,
} from "@/lib/design-system/sce-design-system-08-meta";
import { SCE_DENSE_RSC_BOUNDARY_CONTRACT } from "@/lib/design-system/sce-dense-ui-foundation";
import {
  SCE_DENSE_UI_SEMANTICS,
  SCE_DENSE_SELECTION_CONTRACT,
} from "@/lib/design-system/sce-dense-ui-foundation";
import { SCE_DESIGN_SYSTEM_07_DS08_HANDOFF_DEBT } from "@/lib/design-system/sce-design-system-07-r1-meta";

const ROOT = process.cwd();

function readDoc(relativePath: string): string {
  return readFileSync(join(ROOT, relativePath), "utf8");
}

function readSrc(relativePath: string): string {
  return readFileSync(join(ROOT, relativePath), "utf8");
}

describe("SCE-DESIGN-SYSTEM-08 tables, lists & dense UI guardrails", () => {
  it("documents DS-08 roadmap, inventory, and master design system section", () => {
    const roadmap = readDoc("docs/roadmap/SCE-DESIGN-SYSTEM-08.md");
    expect(roadmap).toContain(SCE_DESIGN_SYSTEM_08_PACKAGE_KEY);
    expect(roadmap).toContain("DENSE_UI_SYSTEM_PRODUCT_WIDE");

    const inventory = readDoc("docs/design/SCE-DESIGN-SYSTEM-08-DENSE-UI-INVENTORY.md");
    expect(inventory).toContain("DENSE_UI_MIGRATION_INVENTORY");

    const ds09Handoff = readDoc("docs/design/SCE-DESIGN-SYSTEM-08-DS09-HANDOFF.md");
    expect(ds09Handoff).toContain("SCE_DESIGN_SYSTEM_08_DS09_HANDOFF_DEBT");

    const master = readDoc("docs/design/SCE-DESIGN-SYSTEM.md");
    for (const marker of SCE_DESIGN_SYSTEM_08_DOC_MARKERS.slice(0, 12)) {
      expect(master).toContain(marker);
    }
  });

  it("records PO closure acceptance on PR #886", () => {
    expect(SCE_DESIGN_SYSTEM_08_PO_CLOSURE.PO_DS08_VISUAL_UAT).toBe("PASS");
    expect(SCE_DESIGN_SYSTEM_08_PO_CLOSURE.PO_DS08_R1_RUNTIME_REVIEW).toBe("PASS");
    expect(SCE_DESIGN_SYSTEM_08_PO_CLOSURE.PO_PEOPLE_ACCESS_DESKTOP_REVIEW).toBe("PASS");
    expect(SCE_DESIGN_SYSTEM_08_PO_CLOSURE.PO_ROLES_DENSE_TABLE_REVIEW).toBe("PASS");
    expect(SCE_DESIGN_SYSTEM_08_PO_CLOSURE.DS08_STATUS).toBe("CLOSED / ACCEPTED / MERGED");
    expect(SCE_DESIGN_SYSTEM_08_PO_REVIEW.DS08_STATUS).toBe("CLOSED / ACCEPTED / MERGED");
    expect(SCE_DESIGN_SYSTEM_08_PO_CLOSURE.ACCEPTED_R1_HEAD).toBe(
      "d164cafd8b2fc9cb8184d7d499d8201ef2b4c783",
    );
    expect(SCE_DESIGN_SYSTEM_08_REPRESENTATIVE_ADOPTION.PEOPLE_ACCESS_DENSE_UI).toBe("ACCEPTED");
    expect(SCE_DESIGN_SYSTEM_08_REPRESENTATIVE_ADOPTION.ROLES_OVERVIEW_DENSE_UI).toBe("ACCEPTED");
    expect(SCE_DESIGN_SYSTEM_08_REPRESENTATIVE_ADOPTION.BILLING_TABLE_BRIDGE).toBe("ACCEPTED");
  });

  it("locks DS-09 handoff — responsive/a11y not claimed by DS-08", () => {
    expect(SCE_DESIGN_SYSTEM_08_DS09_HANDOFF.RESPONSIVE_FINAL_HARDENING).toBe("DS09");
    expect(SCE_DESIGN_SYSTEM_08_DS09_HANDOFF.ACCESSIBILITY_FINAL_HARDENING).toBe("DS09");
    expect(SCE_DESIGN_SYSTEM_08_DS09_HANDOFF_DEBT.length).toBeGreaterThanOrEqual(20);
    expect(SCE_DESIGN_SYSTEM_08_GOVERNANCE.PRODUCT_WIDE_DENSE_UI_MIGRATION_COMPLETE).toBe("NO");
    expect(SCE_DESIGN_SYSTEM_08_GOVERNANCE.LOCAL_PARALLEL_DENSE_UI_SYSTEMS_ALLOWED).toBe("NO");
    expect(SCE_DESIGN_SYSTEM_08_GOVERNANCE.DS10_FINAL_ADOPTION_REQUIRED).toBe("YES");
  });

  it("locks dense UI governance and baseline STAGE", () => {
    expect(SCE_DESIGN_SYSTEM_08_PO_FLAGS.DENSE_UI_SYSTEM_PRODUCT_WIDE).toBe("YES");
    expect(SCE_DESIGN_SYSTEM_08_PO_FLAGS.TABLE_SYSTEM_CANONICAL).toBe("YES");
    expect(SCE_DESIGN_SYSTEM_08_PO_FLAGS.LIST_SYSTEM_CANONICAL).toBe("YES");
    expect(SCE_DESIGN_SYSTEM_08_PO_REVIEW.BASELINE_STAGE_HEAD).toBe(
      "867d6c4a443d33ee219a65d71c755fd78e352bbc",
    );
    expect(SCE_DESIGN_SYSTEM_08_GOVERNANCE.BINARY_CONTROL_COMPLIANCE).toBe("PASS");
    expect(SCE_DESIGN_SYSTEM_08_GOVERNANCE.NEW_BINARY_CHECKBOXES).toBe(0);
    expect(SCE_DESIGN_SYSTEM_08_GOVERNANCE.CARD_SOUP_ALLOWED).toBe("NO");
    expect(SCE_DESIGN_SYSTEM_08_GOVERNANCE.TABLE_WHEN_COLUMN_RELATIONSHIPS_MATTER).toBe("YES");
    expect(SCE_DESIGN_SYSTEM_08_GOVERNANCE.SERVER_COMPONENT_SAFE_DENSE_UI_API).toBe("YES");
    expect(SCE_DENSE_RSC_BOUNDARY_CONTRACT.EVENT_HANDLERS_CROSS_RSC_BOUNDARY).toBe("NO");
  });

  it("consumes DS-07 → DS-08 handoff debt", () => {
    expect(SCE_DESIGN_SYSTEM_07_DS08_HANDOFF_DEBT.length).toBeGreaterThanOrEqual(8);
    expect(SCE_DESIGN_SYSTEM_08_GOVERNANCE.DS07_HANDOFF_DEBT).toEqual(SCE_DESIGN_SYSTEM_07_DS08_HANDOFF_DEBT);
  });

  it("defines product-wide dense UI audit with required surfaces", () => {
    expect(SCE_DESIGN_SYSTEM_08_DENSE_UI_AUDIT.length).toBeGreaterThanOrEqual(12);
    const areas = SCE_DESIGN_SYSTEM_08_DENSE_UI_AUDIT.map((row) => row.area);
    expect(areas).toContain("Personen & Zugänge");
    expect(areas).toContain("Roles overview");
    expect(areas).toContain("Facilities admin");
    expect(SCE_DESIGN_SYSTEM_08_DENSE_UI_INVENTORY.length).toBe(SCE_DESIGN_SYSTEM_08_DENSE_UI_AUDIT.length);
  });

  it("records representative adoption in product code", () => {
    const people = readSrc("components/admin/users/TenantUsersSearchableList.tsx");
    expect(people).toContain("SceDenseSurface");
    expect(people).toContain("PeopleAccessDenseUserRow");
    expect(people).toContain('feedbackSurfaceId="people-access-list"');

    const roles = readSrc("components/admin/roles/TenantRolesOverviewDenseTable.tsx");
    expect(roles).toContain("SceDataTable");
    expect(roles).toContain('feedbackSurfaceId="roles-overview-list"');

    const billing = readSrc("components/admin/billing/shell/BillingDataTable.tsx");
    expect(billing).toContain("SceDataTable");
  });

  it("locks selection and table/list semantics", () => {
    expect(SCE_DENSE_UI_SEMANTICS.CARD_GRID_AS_DEFAULT_DENSE_UI).toBe("NO");
    expect(SCE_DENSE_SELECTION_CONTRACT.ROW_SELECTION_CHECKBOX_ALLOWED).toBe("YES_WHEN_MULTI_SELECTION");
    expect(SCE_DENSE_SELECTION_CONTRACT.BINARY_SETTING_CHECKBOX_ALLOWED).toBe("NO");
    expect(SCE_DESIGN_SYSTEM_08_CANONICAL_DENSE_PRIMITIVES.DENSE_SURFACE).toBe("SceDenseSurface");
    expect(SCE_DESIGN_SYSTEM_08_REPRESENTATIVE_ADOPTION.VISIBLE_PRODUCT_ADOPTION_REQUIRED).toBe("YES");
  });
});
