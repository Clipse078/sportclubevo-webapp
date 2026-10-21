import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  SCE_DESIGN_SYSTEM_10R1_ORGANISATION_CANVAS,
  SCE_DESIGN_SYSTEM_10R1_PO_CORRECTION,
  SCE_DESIGN_SYSTEM_10R1_CREATE_FLOW,
} from "@/lib/design-system/sce-design-system-10r1-meta";
import { SCE_DESIGN_SYSTEM_10_GOVERNANCE } from "@/lib/design-system/sce-design-system-10-meta";

const ROOT = process.cwd();

function readSrc(relativePath: string): string {
  return readFileSync(join(ROOT, relativePath), "utf8");
}

describe("SCE-DESIGN-SYSTEM-10R1 PO visual correction", () => {
  it("does not claim product-wide visual completion before PO accepts R1", () => {
    expect(SCE_DESIGN_SYSTEM_10R1_PO_CORRECTION.PRODUCT_WIDE_DESIGN_MIGRATION_COMPLETE).toBe("NO");
    expect(SCE_DESIGN_SYSTEM_10_GOVERNANCE.PRODUCT_WIDE_DESIGN_MIGRATION_COMPLETE).toBe("NO");
    expect(SCE_DESIGN_SYSTEM_10R1_PO_CORRECTION.SCE_DESIGN_SYSTEM_10R1_READY_FOR_PO_REVIEW).toBe(
      "YES",
    );
  });

  it("wires organisation canvas on authoritative OrgUnit model", () => {
    expect(SCE_DESIGN_SYSTEM_10R1_ORGANISATION_CANVAS.AUTHORITATIVE_ORG_MODEL_REUSED).toBe("YES");
    expect(SCE_DESIGN_SYSTEM_10R1_ORGANISATION_CANVAS.FREEFORM_WHITEBOARD).toBe("NO");
    expect(readSrc("app/(admin)/dashboard/org-units/page.tsx")).toContain("OrgUnitBuilderWorkspace");
    expect(readSrc("components/admin/org/OrgUnitBuilderWorkspace.tsx")).toContain("OrgUnitCanvasView");
    expect(readSrc("components/admin/org/OrgUnitCanvasView.tsx")).not.toMatch(/prisma\.|new OrgUnit\(/);
  });

  it("uses modal-first create triggers on corrected representative CTAs", () => {
    expect(SCE_DESIGN_SYSTEM_10R1_CREATE_FLOW.CREATE_IN_CONTEXT).toBe("MODAL_FIRST");
    expect(readSrc("app/(admin)/vereinsleitung/targets/page.tsx")).toContain("CreateTargetTrigger");
    expect(readSrc("app/(admin)/vereinsleitung/meetings/page.tsx")).toContain("CreateMeetingTrigger");
    expect(readSrc("app/(admin)/vereinsleitung/initiativen/page.tsx")).toContain(
      "CreateInitiativeTrigger",
    );
    expect(readSrc("app/(admin)/dashboard/administration/roles/page.tsx")).toContain(
      "CreateTenantRoleTrigger",
    );
    expect(readSrc("components/admin/org/OrgUnitCreateTrigger.tsx")).toContain(
      'data-sce-create-flow="modal"',
    );
  });

  it("retains fallback /new routes for deep links", () => {
    for (const route of [
      "app/(admin)/dashboard/org-units/new/page.tsx",
      "app/(admin)/vereinsleitung/targets/new/page.tsx",
      "app/(admin)/vereinsleitung/initiativen/new/page.tsx",
      "app/(admin)/vereinsleitung/meetings/new/page.tsx",
      "app/(admin)/dashboard/administration/roles/new/page.tsx",
      "app/(admin)/dashboard/communication/mitteilungen/new/page.tsx",
      "app/(admin)/dashboard/communication/kampagnen/new/page.tsx",
    ]) {
      expect(readSrc(route)).toBeTruthy();
    }
  });

  it("avoids white legacy workspace on corrected Vereinsziele list", () => {
    const targetsPage = readSrc("app/(admin)/vereinsleitung/targets/page.tsx");
    expect(targetsPage).not.toContain("bg-white");
    expect(targetsPage).toContain("ListPagePattern");
  });
});
