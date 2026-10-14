import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { createEmptyTournamentComposerDraft } from "@/lib/tournaments/composer/tournament-composer-draft-types";
import { hydrateTournamentComposerFormFromDraft } from "@/lib/tournaments/composer/hydrate-tournament-composer-form-from-draft";
import {
  buildTenantOrganiserPickerResult,
  resolveEffectiveOrganiserSelection,
  resolvePersistedOrganizerNameFromComposerPayload,
  sanitizeOrganiserDraftFields,
  TOURNAMENT_TENANT_ORGANISER_PICKER_ID,
} from "@/lib/tournaments/composer/tournament-composer-organiser";
import {
  SCE_Z_INDEX_MODAL_OVERLAY,
  SCE_Z_INDEX_MODAL_OVERLAY_ELEVATED,
} from "@/lib/ui/sce-overlay-layering";

const root = process.cwd();
function read(rel: string): string {
  return readFileSync(join(root, rel), "utf8");
}

describe("SCE-ACTIVITY-CREATE-01F-R4 — HOME organiser + participant sections + overlay", () => {
  it("HOME organiser resolves tenant club and strips external draft fields", () => {
    const draft = createEmptyTournamentComposerDraft();
    draft.homeAway = "HOME";
    draft.organizerExternalClubId = "club-basel";
    draft.organizerExternalClubName = "FC Basel";

    const hydrated = hydrateTournamentComposerFormFromDraft(draft);
    expect(hydrated.organizerExternalClubId).toBeNull();
    expect(hydrated.organizerExternalClubName).toBeNull();

    const effective = resolveEffectiveOrganiserSelection({
      homeAway: "HOME",
      externalSelection: { id: "club-basel", name: "FC Basel", shortName: null },
      tenantClubName: "FC Allschwil",
      tenantLogoUrl: "/logo.png",
    });
    expect(effective?.id).toBe(TOURNAMENT_TENANT_ORGANISER_PICKER_ID);
    expect(effective?.name).toBe("FC Allschwil");

    expect(
      resolvePersistedOrganizerNameFromComposerPayload(hydrated, "FC Allschwil"),
    ).toBe("FC Allschwil");
  });

  it("AWAY allows external organiser and persists picker name", () => {
    const draft = createEmptyTournamentComposerDraft();
    draft.homeAway = "AWAY";
    draft.organizerExternalClubId = "club-basel";
    draft.organizerExternalClubName = "FC Basel";

    const sanitized = sanitizeOrganiserDraftFields(
      draft.homeAway,
      draft.organizerExternalClubId,
      draft.organizerExternalClubName,
    );
    expect(sanitized.organizerExternalClubId).toBe("club-basel");

    expect(
      resolvePersistedOrganizerNameFromComposerPayload(
        { ...draft, ...sanitized },
        "FC Allschwil",
      ),
    ).toBe("FC Basel");
  });

  it("HOME organiser field is read-only tenant identity", () => {
    const field = read("components/admin/tournamentcenter/TournamentOrganizerClubField.tsx");
    expect(field).toContain("tenant-identity");
    expect(field).toContain('homeAway === "HOME"');
  });

  it("own-team section exposes direct TEAM_ONLY selector action", () => {
    const section = read("components/admin/tournamentcenter/TournamentOwnTeamsSection.tsx");
    expect(section).toContain("Eigene Teams");
    expect(section).toContain("Eigenes Team hinzufügen");
    expect(section).toContain('mode="TEAM_ONLY"');
    expect(section).toContain("tournament-own-team-add");
    expect(section).not.toContain("PopoverContent");
  });

  it("external-club section exposes direct CLUB_ONLY selector without popover nesting", () => {
    const section = read("components/admin/tournamentcenter/TournamentExternalClubsSection.tsx");
    expect(section).toContain("Teilnehmende Vereine");
    expect(section).toContain("Verein hinzufügen");
    expect(section).toContain('mode="CLUB_ONLY"');
    expect(section).toContain('testIdPrefix="tournament-participant-club-selector"');
    expect(section).not.toContain("CLUB_THEN_TEAM");
    expect(section).not.toContain("PopoverContent");
  });

  it("composer teams step uses separated participant sections", () => {
    const form = read("components/admin/tournamentcenter/TournamentCreateForm.tsx");
    expect(form).toContain("TournamentOwnTeamsSection");
    expect(form).toContain("TournamentExternalClubsSection");
    expect(form).toContain("TournamentManualParticipantSection");
    expect(form).not.toContain("SceTournamentParticipantLobby");
  });

  it("participant workflow removes popover menu (overlay fix)", () => {
    const workflow = read("components/admin/tournamentcenter/TournamentParticipantAddWorkflow.tsx");
    expect(workflow).not.toContain("PopoverContent");
    expect(workflow).toContain("SceClubTeamSelectorDialog");
  });

  it("selector dialog uses elevated stack layer above composer overlay", () => {
    const selector = read("components/sce/club-team-selector/SceClubTeamSelectorDialog.tsx");
    expect(selector).toContain('stackLayer="elevated"');
    expect(SCE_Z_INDEX_MODAL_OVERLAY_ELEVATED).toBeGreaterThan(SCE_Z_INDEX_MODAL_OVERLAY);
  });

  it("final review separates organiser, own teams, external clubs, and manual participants", () => {
    const review = read("components/admin/tournamentcenter/TournamentCreateReviewPanel.tsx");
    expect(review).toContain("tournament-create-review-organiser");
    expect(review).toContain("tournament-create-review-own-teams");
    expect(review).toContain("tournament-create-review-external-clubs");
    expect(review).toContain("tournament-create-review-manual-participants");
    expect(review).toContain("tournament-create-review-participant-total");
    expect(review).toContain("gesamt");
  });

  it("buildTenantOrganiserPickerResult uses synthetic tenant id", () => {
    const picker = buildTenantOrganiserPickerResult("FC Allschwil", null);
    expect(picker.id).toBe(TOURNAMENT_TENANT_ORGANISER_PICKER_ID);
    expect(picker.name).toBe("FC Allschwil");
  });

  it("create path resolves HOME organiser name from tenant", () => {
    const create = read("lib/tournaments/composer/create-tournament-from-composer.ts");
    expect(create).toContain("resolvePersistedOrganizerNameFromComposerPayload");
  });
});
