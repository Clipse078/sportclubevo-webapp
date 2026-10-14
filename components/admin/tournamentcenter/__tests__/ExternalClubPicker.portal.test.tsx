/**
 * @vitest-environment jsdom
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

describe("ExternalClubPicker — composer-safe portal results", () => {
  it("supports portalResults for overflow-safe listbox rendering", () => {
    const source = readFileSync(
      join(process.cwd(), "components/admin/tournamentcenter/ExternalClubPicker.tsx"),
      "utf8",
    );
    expect(source).toContain("portalResults");
    expect(source).toContain("PopoverContent");
  });
});
