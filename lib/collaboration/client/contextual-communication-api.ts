import type { ActivityCollaborationDomain } from "@/lib/collaboration/activity-change/types";

export function contextualPrepareCommunicationPath(
  domain: ActivityCollaborationDomain,
  activityId: string,
): string {
  switch (domain) {
    case "TRAINING":
      return `/api/collaboration/training-sessions/${activityId}/prepare-communication`;
    case "MATCH":
      return `/api/collaboration/matches/${activityId}/prepare-communication`;
    case "TOURNAMENT":
      return `/api/collaboration/tournaments/${activityId}/prepare-communication`;
    case "CLUB_EVENT":
      return `/api/collaboration/club-events/${activityId}/prepare-communication`;
    default:
      throw new Error(`unsupported collaboration domain: ${domain}`);
  }
}

export function contextualMultiTrainingSeriesPreparePath(trainingSeriesId: string): string {
  return `/api/collaboration/training-series/${trainingSeriesId}/prepare-communication`;
}

export function contextualMultiTrainingSeriesPublishPath(trainingSeriesId: string): string {
  return `/api/collaboration/training-series/${trainingSeriesId}/publish-communication`;
}

export function contextualPublishCommunicationPath(
  domain: ActivityCollaborationDomain,
  activityId: string,
): string {
  switch (domain) {
    case "TRAINING":
      return `/api/collaboration/training-sessions/${activityId}/publish-communication`;
    case "MATCH":
      return `/api/collaboration/matches/${activityId}/publish-communication`;
    case "TOURNAMENT":
      return `/api/collaboration/tournaments/${activityId}/publish-communication`;
    case "CLUB_EVENT":
      return `/api/collaboration/club-events/${activityId}/publish-communication`;
    default:
      throw new Error(`unsupported collaboration domain: ${domain}`);
  }
}
