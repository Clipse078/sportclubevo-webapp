import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  SCE_DESIGN_SYSTEM_10_GOVERNANCE,
  SCE_DESIGN_SYSTEM_10_MIGRATION_MATRIX_COUNTS,
} from "@/lib/design-system/sce-design-system-10-meta";
import {
  SCE_DESIGN_SYSTEM_10_R4_CLOSURE_LEDGER,
  SCE_DESIGN_SYSTEM_10_R4_CREATE_FLOW_LEDGER,
  deriveDs10R4ClosureCounters,
} from "@/lib/design-system/sce-design-system-10-r4-closure-ledger";
import { SCE_DESIGN_SYSTEM_10_R4_ENGINEERING } from "@/lib/design-system/sce-design-system-10-r4-product-wide-meta";

const ROOT = process.cwd();

function readSrc(relativePath: string): string {
  return readFileSync(join(ROOT, relativePath), "utf8");
}

describe("SCE-DESIGN-SYSTEM-10-R4 product-wide closure", () => {
  it("derives coherent closure counters from typed ledger", () => {
    const derived = deriveDs10R4ClosureCounters();
    expect(SCE_DESIGN_SYSTEM_10_R4_CLOSURE_LEDGER.length).toBeGreaterThanOrEqual(47);
    expect(derived.UNCLASSIFIED_SURFACES).toBe(0);
    expect(derived.UNRESOLVED_MIGRATION_DEBT).toBe(0);
    expect(derived.REMAINING_LIGHT_FUNCTIONAL_SURFACES).toBe(0);
    expect(derived.REMAINING_FULL_PAGE_PRIMARY_CREATE_FLOWS).toBe(0);
    expect(SCE_DESIGN_SYSTEM_10_MIGRATION_MATRIX_COUNTS.UNRESOLVED_MIGRATION_DEBT).toBe(
      derived.UNRESOLVED_MIGRATION_DEBT,
    );
  });

  it("records engineering migration complete with PO visual UAT still pending", () => {
    expect(SCE_DESIGN_SYSTEM_10_R4_ENGINEERING.ENGINEERING_MIGRATION_COMPLETE).toBe("YES");
    expect(SCE_DESIGN_SYSTEM_10_R4_ENGINEERING.PO_DS10_PRODUCT_WIDE_VISUAL_UAT).toBe("PENDING");
    expect(SCE_DESIGN_SYSTEM_10_R4_ENGINEERING.SCE_DESIGN_SYSTEM_10_READY_FOR_CLOSURE).toBe("NO");
    expect(SCE_DESIGN_SYSTEM_10_GOVERNANCE.PRODUCT_WIDE_DESIGN_MIGRATION_COMPLETE).toBe("YES");
  });

  it("wires modal-first primary create triggers on remaining R3 debt routes", () => {
    expect(readSrc("app/(admin)/dashboard/users/page.tsx")).toContain("PlatformUserCreateTrigger");
    expect(readSrc("app/(admin)/dashboard/admin/tenants/page.tsx")).toContain("TenantCreateTrigger");
    expect(readSrc("app/(admin)/dashboard/admin/commercial/billing/customers/page.tsx")).toContain(
      "NativeBillingCreateCustomerTrigger",
    );
    expect(readSrc("app/(admin)/dashboard/website/news/page.tsx")).toContain("NewsArticleCreateTrigger");
    expect(SCE_DESIGN_SYSTEM_10_R4_CREATE_FLOW_LEDGER.every((r) => r.engineeringComplete)).toBe(true);
  });

  it("forbids forbidden ledger dispositions", () => {
    for (const row of SCE_DESIGN_SYSTEM_10_R4_CLOSURE_LEDGER) {
      expect(row.finalDisposition).not.toMatch(/MIGRATE_LATER|UNKNOWN|TODO|UNCLASSIFIED/i);
    }
  });
});
