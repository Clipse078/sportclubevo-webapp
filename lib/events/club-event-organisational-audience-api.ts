import type {
  ClubEventOrganisationalAudienceEditorValue,
  ClubEventOrganisationalAudienceInput,
  ClubEventOrganisationalAudienceTargetKind,
} from "./club-event-organisational-audience-types";

export function clubEventOrganisationalAudienceEditorToApiPayload(
  value: ClubEventOrganisationalAudienceEditorValue,
): ClubEventOrganisationalAudienceInput {
  return {
    scope: value.scope,
    targets: value.targets.map((t) => ({ kind: t.kind, id: t.id })),
  };
}

export function parseClubEventOrganisationalAudienceFromApiBody(
  raw: unknown,
): ClubEventOrganisationalAudienceInput | undefined {
  if (raw === undefined || raw === null) return undefined;
  if (typeof raw !== "object") {
    throw new Error("INVALID_AUDIENCE");
  }

  const body = raw as Record<string, unknown>;
  const scope = body.scope;
  if (scope !== "CLUB_WIDE" && scope !== "SELECTED_ORG_UNITS") {
    throw new Error("INVALID_AUDIENCE_SCOPE");
  }

  const targetsRaw = body.targets;
  if (targetsRaw !== undefined) {
    if (!Array.isArray(targetsRaw)) {
      throw new Error("INVALID_AUDIENCE_TARGETS");
    }
    const targets = targetsRaw.map((entry) => {
      if (!entry || typeof entry !== "object") throw new Error("INVALID_AUDIENCE_TARGETS");
      const row = entry as Record<string, unknown>;
      const kind = row.kind ?? row.type;
      const id = row.id;
      if (kind !== "TEAM" && kind !== "ORG_UNIT") {
        throw new Error("INVALID_AUDIENCE_TARGETS");
      }
      if (typeof id !== "string" || !id.trim()) {
        throw new Error("INVALID_AUDIENCE_TARGETS");
      }
      return { kind: kind as ClubEventOrganisationalAudienceTargetKind, id: id.trim() };
    });
    return { scope, targets };
  }

  const teamIds = Array.isArray(body.teamIds)
    ? body.teamIds.filter((id): id is string => typeof id === "string" && Boolean(id.trim()))
    : undefined;
  const orgUnitIds = Array.isArray(body.orgUnitIds)
    ? body.orgUnitIds.filter((id): id is string => typeof id === "string" && Boolean(id.trim()))
    : undefined;

  return { scope, teamIds, orgUnitIds };
}
