import type { ExternalClubPickerResult } from "@/components/admin/tournamentcenter/ExternalClubPicker";
import { organizerNameFromPickerSelection } from "@/lib/tournaments/organizer-picker-state";
import type { TournamentComposerDraftPayload } from "./tournament-composer-draft-types";

/** Synthetic picker id — HOME organiser is always the tenant club, not a directory row. */
export const TOURNAMENT_TENANT_ORGANISER_PICKER_ID = "__tenant-organiser__";

export function buildTenantOrganiserPickerResult(
  tenantClubName: string,
  tenantLogoUrl: string | null,
): ExternalClubPickerResult {
  return {
    id: TOURNAMENT_TENANT_ORGANISER_PICKER_ID,
    name: tenantClubName,
    shortName: null,
    logoUrl: tenantLogoUrl,
  };
}

export function resolveEffectiveOrganiserSelection(input: {
  homeAway: "HOME" | "AWAY";
  externalSelection: ExternalClubPickerResult | null;
  tenantClubName: string;
  tenantLogoUrl: string | null;
}): ExternalClubPickerResult | null {
  if (input.homeAway === "HOME") {
    if (!input.tenantClubName.trim()) return null;
    return buildTenantOrganiserPickerResult(input.tenantClubName, input.tenantLogoUrl);
  }
  return input.externalSelection;
}

export function sanitizeOrganiserDraftFields(
  homeAway: "HOME" | "AWAY",
  organizerExternalClubId: string | null,
  organizerExternalClubName: string | null,
): { organizerExternalClubId: string | null; organizerExternalClubName: string | null } {
  if (homeAway === "HOME") {
    return { organizerExternalClubId: null, organizerExternalClubName: null };
  }
  return { organizerExternalClubId, organizerExternalClubName };
}

export function resolvePersistedOrganizerNameFromComposerPayload(
  payload: Pick<
    TournamentComposerDraftPayload,
    "homeAway" | "organizerExternalClubId" | "organizerExternalClubName"
  >,
  tenantClubName: string,
): string | null {
  if (payload.homeAway === "HOME") {
    const trimmed = tenantClubName.trim();
    return trimmed || null;
  }
  return organizerNameFromPickerSelection(
    payload.organizerExternalClubId
      ? {
          id: payload.organizerExternalClubId,
          name: payload.organizerExternalClubName ?? "",
          shortName: null,
        }
      : null,
  );
}
