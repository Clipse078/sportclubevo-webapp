import { buildSportingActivityLocation } from "@/lib/sporting-activity-presentation/location";
import type { PersonalProgrammePresentationStatus } from "@/lib/personal-agenda/personal-programme-types";
import type { SceMeetingPresentationModel } from "../types";

export type ResolveSceMeetingPresentationInput = {
  meetingId: string;
  slug: string;
  title: string;
  meetingDate: Date;
  location?: string | null;
  contextLabel?: string;
  status?: PersonalProgrammePresentationStatus;
  plannedDurationMin?: number | null;
};

function mapMeetingPresentationStatus(
  status: PersonalProgrammePresentationStatus | undefined,
): SceMeetingPresentationModel["status"] {
  if (!status) return undefined;
  switch (status) {
    case "scheduled":
      return { domain: status, semantic: "planned", label: "Geplant" };
    case "cancelled":
      return { domain: status, semantic: "cancelled", label: "Abgesagt" };
    case "completed":
      return { domain: status, semantic: "completed", label: "Abgeschlossen" };
    default:
      return { domain: status, semantic: "neutral", label: undefined };
  }
}

export function resolveSceMeetingPresentationFromProgramme(
  input: ResolveSceMeetingPresentationInput,
): SceMeetingPresentationModel {
  const startAt = input.meetingDate;
  const endsAt =
    input.plannedDurationMin != null && input.plannedDurationMin > 0
      ? new Date(startAt.getTime() + input.plannedDurationMin * 60_000)
      : null;

  const venue = input.location?.trim();

  return {
    kind: "MEETING",
    activityId: input.meetingId,
    resourceKey: `meeting:${input.meetingId}`,
    typeLabel: "Meeting",
    meetingTitle: input.title.trim(),
    organisationalContext: input.contextLabel?.trim() || undefined,
    schedule: {
      startAt: startAt.toISOString(),
      endAt: endsAt?.toISOString() ?? null,
      allDay: false,
    },
    location: buildSportingActivityLocation({
      mode: "UNKNOWN",
      venueName: venue || undefined,
    }),
    route: {
      resourceKey: `meeting:${input.meetingId}`,
      consumeHref: `/vereinsleitung/meetings/${input.slug}`,
      manageHref: null,
    },
    status: mapMeetingPresentationStatus(input.status),
  };
}
