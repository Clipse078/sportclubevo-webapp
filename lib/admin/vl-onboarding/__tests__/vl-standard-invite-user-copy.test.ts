import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import {
  VL_STANDARD_INVITE_CONTRIBUTOR_ROLE_NOTE,
  VL_STANDARD_INVITE_PREPARE_BUTTON_LABEL,
  VL_STANDARD_INVITE_PREPARE_STATUS_HINT,
  VL_STANDARD_INVITE_SEND_CONTRIBUTOR_ROLE_NOTE,
} from "@/lib/admin/vl-onboarding/vl-standard-invite-user-copy";

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "../../../..");

function readRepoFile(relativePath: string): string {
  return readFileSync(join(repoRoot, relativePath), "utf8");
}

describe("vl standard invite user copy", () => {
  it("uses club-language strings without Dry-Run jargon", () => {
    for (const value of [
      VL_STANDARD_INVITE_CONTRIBUTOR_ROLE_NOTE,
      VL_STANDARD_INVITE_PREPARE_STATUS_HINT,
      VL_STANDARD_INVITE_PREPARE_BUTTON_LABEL,
      VL_STANDARD_INVITE_SEND_CONTRIBUTOR_ROLE_NOTE,
    ]) {
      expect(value.toLowerCase()).not.toContain("dry-run");
    }
  });

  it("explains live-send blocker when contributor role is missing", () => {
    expect(VL_STANDARD_INVITE_CONTRIBUTOR_ROLE_NOTE).toContain("Vereinsleitung (Pilot)");
    expect(VL_STANDARD_INVITE_CONTRIBUTOR_ROLE_NOTE).toContain("Live-Versand");
  });

  it("keeps Dry-Run out of wizard UI surfaces", () => {
    const uiSources = [
      "components/admin/users/people-access/PeopleAccessVlStandardInviteSections.tsx",
      "components/admin/users/people-access/PeopleAccessWizard.tsx",
    ];
    for (const path of uiSources) {
      expect(readRepoFile(path).toLowerCase()).not.toContain("dry-run");
    }
  });
});