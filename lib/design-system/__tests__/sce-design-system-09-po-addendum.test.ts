import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  SCE_CREATE_FLOW_LOCKS,
  SCE_CREATE_FLOW_REPRESENTATIVE_AUDIT,
} from "@/lib/design-system/sce-create-flow-foundation";
import {
  SCE_DENSITY_BORDER_REPRESENTATIVE_AUDIT,
  SCE_DENSITY_BORDER_SYSTEM_LOCKS,
} from "@/lib/design-system/sce-density-border-foundation";
import { SCE_DENSE_OPERATIONAL_PAGE_ROOT_CLASS } from "@/lib/design-system/sce-density-border-micro-ux";
import {
  SCE_DS09_BINARY_CONTROL_AUDIT,
} from "@/lib/design-system/sce-binary-checkbox-audit";
import {
  SCE_DESIGN_SYSTEM_09_CREATE_FLOW_AUDIT,
  SCE_DESIGN_SYSTEM_09_DENSITY_BORDER_AUDIT,
  SCE_DESIGN_SYSTEM_09_BINARY_CONTROL_AUDIT,
  SCE_DESIGN_SYSTEM_09_DS10_HANDOFF,
  SCE_DESIGN_SYSTEM_09_GOVERNANCE,
  SCE_DESIGN_SYSTEM_09_PO_REVIEW,
  SCE_DESIGN_SYSTEM_09_REPRESENTATIVE_ADOPTION,
} from "@/lib/design-system/sce-design-system-09-meta";

const ROOT = process.cwd();

function readSrc(relativePath: string): string {
  return readFileSync(join(ROOT, relativePath), "utf8");
}

describe("SCE-DESIGN-SYSTEM-09 PO addendum — density, borders, create flow, binary controls", () => {
  it("locks density and border programme gates", () => {
    expect(SCE_DENSITY_BORDER_SYSTEM_LOCKS.DENSITY_SYSTEM_CANONICAL).toBe("YES");
    expect(SCE_DENSITY_BORDER_SYSTEM_LOCKS.BORDER_SYSTEM_CANONICAL).toBe("YES");
    expect(SCE_DENSITY_BORDER_SYSTEM_LOCKS.NESTED_BORDER_SOUP_ALLOWED).toBe("NO");
    expect(SCE_DENSITY_BORDER_SYSTEM_LOCKS.CARD_SOUP_ALLOWED).toBe("NO");
    expect(SCE_DESIGN_SYSTEM_09_GOVERNANCE.NESTED_BORDER_SOUP_ALLOWED).toBe("NO");
  });

  it("locks modal-first create flow", () => {
    expect(SCE_CREATE_FLOW_LOCKS.CREATE_FLOW_MODAL_FIRST).toBe("YES");
    expect(SCE_CREATE_FLOW_LOCKS.CREATE_FLOW_FULL_PAGE_DEFAULT).toBe("NO");
    expect(SCE_DESIGN_SYSTEM_09_GOVERNANCE.CREATE_FLOW_MODAL_FIRST).toBe("YES");
  });

  it("extends DS-10 handoff with three audit debts", () => {
    expect(SCE_DESIGN_SYSTEM_09_DS10_HANDOFF.DS10_PRODUCT_WIDE_DENSITY_ADOPTION_REQUIRED).toBe(
      "YES",
    );
    expect(SCE_DESIGN_SYSTEM_09_DS10_HANDOFF.DS10_MODAL_FIRST_CREATE_ADOPTION_REQUIRED).toBe("YES");
    expect(SCE_DESIGN_SYSTEM_09_DS10_HANDOFF.DS10_BINARY_CONTROL_FINAL_MIGRATION_REQUIRED).toBe(
      "YES",
    );
    expect(SCE_DESIGN_SYSTEM_09_DS10_HANDOFF.PRODUCT_WIDE_DENSITY_MIGRATION_COMPLETE).toBe("NO");
    expect(SCE_DESIGN_SYSTEM_09_DS10_HANDOFF.PRODUCT_WIDE_CREATE_FLOW_MIGRATION_COMPLETE).toBe(
      "NO",
    );
    expect(SCE_DESIGN_SYSTEM_09_DS10_HANDOFF.PRODUCT_WIDE_BINARY_CONTROL_MIGRATION_COMPLETE).toBe(
      "NO",
    );
    expect(SCE_DESIGN_SYSTEM_09_DS10_HANDOFF.DEBT).toContain("DENSITY_BORDER_DEBT");
    expect(SCE_DESIGN_SYSTEM_09_DS10_HANDOFF.DEBT).toContain("CREATE_FLOW_MODAL_MIGRATION_DEBT");
    expect(SCE_DESIGN_SYSTEM_09_DS10_HANDOFF.DEBT).toContain("BINARY_CONTROL_MIGRATION_DEBT");
  });

  it("exports representative audits through DS-09 meta", () => {
    expect(SCE_DESIGN_SYSTEM_09_DENSITY_BORDER_AUDIT).toEqual(
      SCE_DENSITY_BORDER_REPRESENTATIVE_AUDIT,
    );
    expect(SCE_DESIGN_SYSTEM_09_CREATE_FLOW_AUDIT).toEqual(SCE_CREATE_FLOW_REPRESENTATIVE_AUDIT);
    expect(SCE_DESIGN_SYSTEM_09_BINARY_CONTROL_AUDIT).toEqual(SCE_DS09_BINARY_CONTROL_AUDIT);
  });

  it("records PO addendum ready-for-review status", () => {
    expect(SCE_DESIGN_SYSTEM_09_PO_REVIEW.DS09_STATUS).toBe("READY_FOR_PO_REVIEW");
    expect(SCE_DESIGN_SYSTEM_09_PO_REVIEW.PO_ADDENDUM).toContain("DENSITY");
  });

  it("hardens roles page overflow containment", () => {
    expect(SCE_DENSE_OPERATIONAL_PAGE_ROOT_CLASS).toContain("min-w-0");
    expect(SCE_DESIGN_SYSTEM_09_GOVERNANCE.DENSE_UI_PAGE_HORIZONTAL_OVERFLOW).toBe("NO");
    expect(SCE_DESIGN_SYSTEM_09_REPRESENTATIVE_ADOPTION.ROLES_PAGE_OVERFLOW_CONTAINMENT).toBe(
      "HARDENED",
    );

    const rolesPage = readSrc("app/(admin)/dashboard/administration/roles/page.tsx");
    expect(rolesPage).toContain("SCE_DENSE_OPERATIONAL_PAGE_ROOT_CLASS");
    expect(rolesPage).toContain('data-testid="roles-overview-page-root"');

    const rolesTable = readSrc("components/admin/roles/TenantRolesOverviewDenseTable.tsx");
    expect(rolesTable).toContain("SCE_DENSE_TABLE_PAGE_CONTAINMENT_CLASS");
  });

  it("adopts modal-first create triggers on representative surfaces", () => {
    expect(readSrc("components/admin/communication/zielgruppen/ZielgruppeCreateTrigger.tsx")).toContain(
      'data-sce-create-flow="modal"',
    );
    expect(readSrc("components/admin/communication/zielgruppen/ZielgruppeCreateComposerDialog.tsx")).toContain(
      'from "@/components/ui/Dialog"',
    );
    expect(readSrc("components/admin/seasons/CreateSeasonTrigger.tsx")).toContain(
      'data-sce-create-flow="modal"',
    );

    const zielgruppeEditor = readSrc(
      "components/admin/communication/zielgruppen/ZielgruppeDefinitionEditor.tsx",
    );
    expect(zielgruppeEditor).toContain("SwitchToggle");
    expect(zielgruppeEditor).not.toMatch(/type="checkbox"[\s\S]*Ganze Organisation/);
  });

  it("keeps binary control compliance locks", () => {
    expect(SCE_DESIGN_SYSTEM_09_GOVERNANCE.BINARY_CONTROL_COMPLIANCE).toBe("PASS");
    expect(SCE_DESIGN_SYSTEM_09_GOVERNANCE.NEW_BINARY_CHECKBOXES).toBe(0);
    expect(SCE_DESIGN_SYSTEM_09_GOVERNANCE.BINARY_SETTING_CHECKBOX_ALLOWED).toBe("NO");
  });
});
