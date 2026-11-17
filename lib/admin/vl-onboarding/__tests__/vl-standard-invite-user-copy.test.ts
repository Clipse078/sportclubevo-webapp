import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import {
  VL_CONTRIBUTOR_ROLE_SETUP_REQUIRED,
  VL_STANDARD_INVITE_CONTRIBUTOR_ROLE_NOTE,
  VL_STANDARD_INVITE_PREPARE_BUTTON_LABEL,
  VL_STANDARD_INVITE_PREPARE_STATUS_HINT_DRY_RUN,
  VL_STANDARD_INVITE_PREPARE_STATUS_HINT_LIVE_ALLOWED,
  VL_STANDARD_INVITE_SEND_CONTRIBUTOR_ROLE_NOTE,
  resolveVlStandardInvitePrepareStatusHint,
} from "@/lib/admin/vl-onboarding/vl-standard-invite-user-copy";

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "../../../..");

function readRepoFile(relativePath: string): string {
  return readFileSync(join(repoRoot, relativePath), "utf8");
}

describe("vl standard invite user copy", () => {
  it("uses club-language strings without Dry-Run jargon", () => {
    for (const value of [
      VL_STANDARD_INVITE_CONTRIBUTOR_ROLE_NOTE,
      VL_STANDARD_INVITE_PREPARE_STATUS_HINT_DRY_RUN,
      VL_STANDARD_INVITE_PREPARE_STATUS_HINT_LIVE_ALLOWED,
      VL_STANDARD_INVITE_PREPARE_BUTTON_LABEL,
      VL_STANDARD_INVITE_SEND_CONTRIBUTOR_ROLE_NOTE,
    ]) {
      expect(value.toLowerCase()).not.toContain("dry-run");
    }
  });

  it("explains live-send blocker when contributor role is missing", () => {
    expect(VL_STANDARD_INVITE_CONTRIBUTOR_ROLE_NOTE).toContain(
      VL_CONTRIBUTOR_ROLE_SETUP_REQUIRED,
    );
    expect(VL_STANDARD_INVITE_CONTRIBUTOR_ROLE_NOTE).toContain("Live-Versand");
  });

  it("avoids operator script jargon on administrator surfaces", () => {
    for (const value of [
      VL_STANDARD_INVITE_CONTRIBUTOR_ROLE_NOTE,
      VL_STANDARD_INVITE_SEND_CONTRIBUTOR_ROLE_NOTE,
      VL_CONTRIBUTOR_ROLE_SETUP_REQUIRED,
    ]) {
      expect(value.toLowerCase()).not.toContain("rollen-sync");
      expect(value).not.toContain("npx tsx");
    }
  });

  it("matches send policy for prepare status hint", () => {
    expect(resolveVlStandardInvitePrepareStatusHint("DRY_RUN")).toBe(
      VL_STANDARD_INVITE_PREPARE_STATUS_HINT_DRY_RUN,
    );
    expect(resolveVlStandardInvitePrepareStatusHint("LIVE_ALLOWED")).toBe(
      VL_STANDARD_INVITE_PREPARE_STATUS_HINT_LIVE_ALLOWED,
    );
    expect(VL_STANDARD_INVITE_PREPARE_STATUS_HINT_LIVE_ALLOWED).toContain("Live-Versand");
    expect(VL_STANDARD_INVITE_PREPARE_STATUS_HINT_LIVE_ALLOWED).not.toContain("VL-Bulk");
  });

  it("keeps Dry-Run out of wizard UI surfaces", () => {
    const uiSources = [
      "components/admin/users/people-access/PeopleAccessVlStandardInviteSections.tsx",
      "components/admin/users/people-access/PeopleAccessWizard.tsx",
    ];
    for (const path of uiSources) {
      const source = readRepoFile(path);
      expect(source.toLowerCase()).not.toContain("dry-run");
      expect(source.toLowerCase()).not.toContain("rollen-sync");
      expect(source).not.toContain("sync-fca-vereinsleitung-contributor-pilot-role");
    }
  });
});