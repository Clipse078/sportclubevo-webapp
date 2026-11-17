import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "../../../..");

describe("standard invite wizard policy wiring", () => {
  it("does not resolve send mode on the client", () => {
    const source = readFileSync(
      join(repoRoot, "components/admin/users/people-access/PeopleAccessStandardInviteSections.tsx"),
      "utf8",
    );
    expect(source).not.toContain("resolveVlInvitationSendMode");
    expect(source).toContain("/api/admin/people-access/invite/policy");
  });

  it("keeps env authority server-only", () => {
    const source = readFileSync(
      join(repoRoot, "lib/admin/vl-onboarding/vl-invitation-send-policy.ts"),
      "utf8",
    );
    expect(source).toContain('import "server-only"');
  });
});