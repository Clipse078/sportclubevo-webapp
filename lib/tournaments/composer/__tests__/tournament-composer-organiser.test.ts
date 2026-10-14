import { describe, expect, it } from "vitest";
import { createEmptyTournamentComposerDraft } from "../tournament-composer-draft-types";
import { hydrateTournamentComposerFormFromDraft } from "../hydrate-tournament-composer-form-from-draft";
import {
  resolveEffectiveOrganiserSelection,
  resolvePersistedOrganizerNameFromComposerPayload,
  sanitizeOrganiserDraftFields,
} from "../tournament-composer-organiser";

describe("tournament-composer-organiser", () => {
  it("clears external organiser when switching payload to HOME via hydrate", () => {
    const draft = createEmptyTournamentComposerDraft();
    draft.homeAway = "HOME";
    draft.organizerExternalClubId = "club-x";
    draft.organizerExternalClubName = "FC X";
    const hydrated = hydrateTournamentComposerFormFromDraft(draft);
    expect(hydrated.organizerExternalClubId).toBeNull();
  });

  it("AWAY → HOME transition drops external authoritative organiser in draft fields", () => {
    const away = sanitizeOrganiserDraftFields("AWAY", "club-x", "FC X");
    expect(away.organizerExternalClubId).toBe("club-x");
    const home = sanitizeOrganiserDraftFields("HOME", away.organizerExternalClubId, away.organizerExternalClubName);
    expect(home.organizerExternalClubId).toBeNull();
    expect(
      resolveEffectiveOrganiserSelection({
        homeAway: "HOME",
        externalSelection: null,
        tenantClubName: "FC Allschwil",
        tenantLogoUrl: null,
      })?.name,
    ).toBe("FC Allschwil");
  });

  it("HOME → AWAY allows external organiser persistence", () => {
    const draft = createEmptyTournamentComposerDraft();
    draft.homeAway = "AWAY";
    draft.organizerExternalClubId = "club-basel";
    draft.organizerExternalClubName = "FC Basel";
    expect(resolvePersistedOrganizerNameFromComposerPayload(draft, "FC Allschwil")).toBe("FC Basel");
  });
});
