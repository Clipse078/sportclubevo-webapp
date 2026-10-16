import { buildClubIdentity, buildNameOnlyClubIdentity } from "@/lib/sporting-activity-design";
import type { ClubEvent } from "@/lib/events/club-events-service";
import type { SportingActivityPresentation } from "@/lib/sporting-activity-presentation/types";
import { buildVeranstaltungenManagementActivityPresentation } from "@/lib/sporting-activity-presentation/management-club-event-presentation";
import {
  mapClubEventLifecycleStatusToProgrammeDomain,
  mapClubEventLifecycleStatusToSemantic,
  resolveClubEventLifecycleStatusLabel,
} from "../club-event-status-presentation";
import { buildSceActivityRoute, parseActivityIdFromResourceKey } from "../route";
import { buildSceActivityPresentationStatus } from "../status";
import { buildSceClubEventAudiencePresentation } from "@/lib/events/club-event-organisational-audience-presentation";
import { attachSceClubEventTenantClubIdentity } from "../club-event-visual-identity";
import type { SceClubEventPresentationModel } from "../types";

export type ResolveSceClubEventPresentationInput = {
  event: ClubEvent;
  tenantClubName?: string | null;
  tenantLogoUrl?: string | null;
  facilityResourceLabel?: string | null;
};

function resolveClubEventOrganiserIdentity(
  event: ClubEvent,
  options: { tenantClubName?: string | null; tenantLogoUrl?: string | null },
): ReturnType<typeof buildNameOnlyClubIdentity> | undefined {
  const organiserName =
    event.organizerName?.trim() || options.tenantClubName?.trim() || undefined;
  if (!organiserName) return undefined;

  const tenantName = options.tenantClubName?.trim();
  const isTenantOrganiser =
    Boolean(tenantName) &&
    (!event.organizerName?.trim() || event.organizerName.trim() === tenantName);

  if (isTenantOrganiser && options.tenantLogoUrl?.trim()) {
    return buildClubIdentity({
      displayName: organiserName,
      logoUrl: options.tenantLogoUrl.trim(),
    });
  }

  return buildNameOnlyClubIdentity(organiserName);
}

export function resolveSceClubEventPresentation(
  input: ResolveSceClubEventPresentationInput,
): SceClubEventPresentationModel {
  const legacy = buildVeranstaltungenManagementActivityPresentation(input.event, {
    facilityResourceLabel: input.facilityResourceLabel,
  });
  const audience = buildSceClubEventAudiencePresentation({
    scope: input.event.organisationalAudience.scope,
    targets: input.event.organisationalAudience.targets,
  });

  return attachSceClubEventTenantClubIdentity(
    resolveSceClubEventPresentationFromLegacy(legacy, {
      organiserDisplayName: input.event.organizerName,
      organiserIdentity: resolveClubEventOrganiserIdentity(input.event, input),
      lifecycleStatus: input.event.status,
      audience,
    }),
    input,
  );
}

export function resolveSceClubEventPresentationFromLegacy(
  presentation: SportingActivityPresentation,
  options: {
    organiserDisplayName?: string | null;
    organiserIdentity?: ReturnType<typeof buildNameOnlyClubIdentity>;
    lifecycleStatus?: string;
    audience?: SceClubEventPresentationModel["audience"];
  } = {},
): SceClubEventPresentationModel {
  const kind = presentation.identity.activityKind;
  if (kind !== "EVENT") {
    throw new Error("resolveSceClubEventPresentationFromLegacy: expected EVENT activity kind");
  }

  const resourceKey = presentation.identity.resourceKey;
  const organiserName =
    options.organiserDisplayName?.trim() ||
    presentation.context?.organiser?.trim() ||
    presentation.location.hostOrOrganiser?.trim();

  const organiser =
    options.organiserIdentity ??
    (organiserName ? buildNameOnlyClubIdentity(organiserName) : undefined);

  const lifecycleStatus = options.lifecycleStatus?.trim();
  const statusLabel = lifecycleStatus
    ? resolveClubEventLifecycleStatusLabel(lifecycleStatus)
    : undefined;

  return {
    kind: "CLUB_EVENT",
    activityId: parseActivityIdFromResourceKey(resourceKey),
    resourceKey,
    typeLabel: presentation.identity.typeLabel?.trim() || "VERANSTALTUNG",
    eventTitle: presentation.identity.title,
    organiser,
    audience: options.audience,
    schedule: { ...presentation.schedule },
    location: { ...presentation.location },
    route: buildSceActivityRoute("CLUB_EVENT", resourceKey),
    status:
      lifecycleStatus && statusLabel
        ? buildSceActivityPresentationStatus({
            domain: mapClubEventLifecycleStatusToProgrammeDomain(lifecycleStatus),
            label: statusLabel,
            semantic: mapClubEventLifecycleStatusToSemantic(lifecycleStatus),
          })
        : presentation.status
          ? buildSceActivityPresentationStatus({ domain: presentation.status })
          : undefined,
  };
}
