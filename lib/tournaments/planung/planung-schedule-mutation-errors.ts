/**
 * User-facing Planung schedule mutation errors (R7.4).
 */

export const PLANUNG_STALE_SCHEDULE_USER_MESSAGE =
  "Der Spielplan wurde zwischenzeitlich geändert. Die aktuelle Version wurde geladen.";

export function resolvePlanungScheduleMutationErrorMessage(params: {
  httpStatus: number;
  code?: string;
  serverMessage?: string;
}): string {
  if (params.httpStatus === 409 && params.code === "SCHEDULE.STALE_VERSION") {
    return PLANUNG_STALE_SCHEDULE_USER_MESSAGE;
  }
  if (params.serverMessage?.includes("Schedule revision mismatch")) {
    return PLANUNG_STALE_SCHEDULE_USER_MESSAGE;
  }
  return params.serverMessage ?? "Die Änderung konnte nicht gespeichert werden.";
}
