import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

describe("WorkspaceDocumentRow layout", () => {
  it("W03-37 long filenames use truncate without fixed overflow width", () => {
    const source = readFileSync(
      resolve(process.cwd(), "components/admin/workspace/WorkspaceDocumentRow.tsx"),
      "utf8",
    );
    expect(source).toContain("truncate");
    expect(source).toContain("min-w-0");
  });
});
