import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { resolveClubEventGovernanceStatusLabel } from "@/lib/veranstaltungen/club-event-governance-status-labels";
import { clubEventPublishedVisibilityWhere } from "@/lib/events/club-event-published-visibility";

const root = process.cwd();

function read(rel: string): string {
  return readFileSync(join(root, rel), "utf8");
}

describe("SCE-ACTIVITY-CREATE-01C-R1 — reference UX completion", () => {
  it("uses composer-safe embedded audience selector in create form", () => {
    const form = read("components/admin/veranstaltungen/VeranstaltungCreateForm.tsx");
    const audience = read("components/admin/veranstaltungen/ClubEventOrganisationalAudienceEditor.tsx");
    expect(form).toContain("composerSafeSelector");
    expect(form).not.toContain("ClubEventCreateWorkflowShell");
    expect(audience).toContain('panelHost={composerSafeSelector ? "embedded" : "sheet"}');
    expect(form).not.toMatch(/ClubEventCreateWorkflowShell/);
  });

  it("does not mount Sheet selector host inside composer audience path", () => {
    const chip = read("components/sce/list-selector/SceChipMultiSelectorField.tsx");
    const panel = read("components/sce/list-selector/SceListSelectorPanel.tsx");
    expect(chip).toContain("panelHost");
    expect(panel).toContain('host === "embedded"');
  });

  it("exposes validator multi-select and person governance controls", () => {
    expect(
      existsSync(join(root, "components/admin/users/people-access/ClubEventValidatorPoolSection.tsx")),
    ).toBe(true);
    const person = read("components/admin/users/people-access/PersonClubEventGovernanceSection.tsx");
    const validators = read("components/admin/users/people-access/ClubEventValidatorPoolSection.tsx");
    expect(person).toContain("SwitchToggle");
    expect(person).toContain("Direkt veröffentlichen");
    expect(validators).toContain("Freigabeberechtigte Personen");
    expect(person).not.toContain("type=\"checkbox\"");
  });

  it("supports draft resume discovery and GET draft API", () => {
    expect(existsSync(join(root, "app/api/club-events/composer/drafts/[draftId]/route.ts"))).toBe(
      true,
    );
    const list = read("components/admin/veranstaltungen/ClubEventComposerDraftList.tsx");
    expect(list).toContain("/dashboard/veranstaltungen/new?draftId=");
  });

  it("provides contextual overlay create entry on management surface", () => {
    const trigger = read("components/admin/veranstaltungen/VeranstaltungenComposerCreateTrigger.tsx");
    expect(trigger).toContain('containerMode="overlay"');
    expect(trigger).toContain("VeranstaltungCreateForm");
  });

  it("maps canonical governance status labels", () => {
    expect(resolveClubEventGovernanceStatusLabel("PENDING_APPROVAL")).toBe("Zur Freigabe");
    expect(resolveClubEventGovernanceStatusLabel("CHANGES_REQUESTED")).toBe(
      "Änderungen angefordert",
    );
  });

  it("retains non-public visibility for draft and approval states", () => {
    expect(clubEventPublishedVisibilityWhere().reviewStage).toEqual({
      in: ["APPROVED", "PUBLISHED"],
    });
  });

  it("validator path requires comment for request changes and reject", () => {
    const form = read("components/admin/veranstaltungen/ClubEventApprovalDecisionForm.tsx");
    expect(form).toContain("REQUEST_CHANGES");
    expect(form).toContain("Ablehnungsgrund");
  });
});
