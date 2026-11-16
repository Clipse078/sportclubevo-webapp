/**
 * Personal dashboard section load outcomes (empty vs unavailable vs failed).
 */

export type PersonalDashboardSectionId =
  | "attention"
  | "programme"
  | "tasks"
  | "secondary";

export type PersonalDashboardSectionSuccess<T> = {
  kind: "success";
  section: PersonalDashboardSectionId;
  data: T;
  /** Genuine empty data for an authorised, supported section — not a load failure. */
  isEmpty: boolean;
  /** Partial upstream degradation (e.g. attention operational sources). */
  degraded?: boolean;
};

export type PersonalDashboardSectionUnavailable = {
  kind: "unavailable";
  section: PersonalDashboardSectionId;
  reason: "not_supported" | "not_authorized";
};

export type PersonalDashboardSectionFailed = {
  kind: "failed";
  section: PersonalDashboardSectionId;
  message: string;
  retryable: boolean;
  /** Diagnostic code for tests/logging — never shown as user-facing primary copy. */
  code?: string;
};

export type PersonalDashboardSectionOutcome<T> =
  | PersonalDashboardSectionSuccess<T>
  | PersonalDashboardSectionUnavailable
  | PersonalDashboardSectionFailed;

export function personalDashboardSectionFailed(
  section: PersonalDashboardSectionId,
  error: unknown,
  fallbackMessage: string,
): PersonalDashboardSectionFailed {
  const message = error instanceof Error && error.message.trim() ? error.message : fallbackMessage;
  return {
    kind: "failed",
    section,
    message,
    retryable: true,
    code: error instanceof Error ? error.name : "unknown",
  };
}