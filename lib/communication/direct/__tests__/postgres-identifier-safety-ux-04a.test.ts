import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

describe("SCE-COMM-UX-04A PostgreSQL identifier safety", () => {
  it("uses explicit short index names in migration", () => {
    const sql = readFileSync(
      join(process.cwd(), "prisma/migrations/20260928150000_sce_comm_ux_04a_direct_message/migration.sql"),
      "utf8",
    );
    expect(sql).toContain("cc_conv_part_tenant_user_idx");
    expect(sql.length).toBeLessThan(8000);
  });
});
