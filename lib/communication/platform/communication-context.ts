/**
 * SCE-COMM-01 — originating context for a communication (not the audience).
 *
 * Context is retained for routing, UX defaults, audit, and authorization scope hints.
 * Sponsor-specific data stays on typed references — no sponsor columns on base comm rows.
 */

export const COMMUNICATION_CONTEXT_KINDS = [
  "ORGANISATION",
  "ORG_UNIT",
  "TEAM",
  "EVENT",
  "SPONSOR",
  "SYSTEM",
] as const;

export type CommunicationContextKind = (typeof COMMUNICATION_CONTEXT_KINDS)[number];

export type CommunicationContextRef =
  | { kind: "ORGANISATION"; tenantId: string }
  | { kind: "ORG_UNIT"; orgUnitId: string }
  | { kind: "TEAM"; teamId: string }
  | { kind: "EVENT"; eventId: string }
  | { kind: "SPONSOR"; sponsorId: string }
  | { kind: "SYSTEM"; moduleKey: string };

export type CommunicationContextValidationError =
  | "MISSING_TENANT"
  | "EMPTY_REFERENCE_ID"
  | "INVALID_MODULE_KEY";

/**
 * Validates shape only. Service layers MUST additionally prove tenant ownership
 * of referenced org units, teams, events, and sponsors before persistence.
 */
export function validateCommunicationContextRef(
  tenantId: string,
  context: CommunicationContextRef,
): CommunicationContextValidationError | null {
  const trimmedTenant = tenantId.trim();
  if (!trimmedTenant) return "MISSING_TENANT";

  switch (context.kind) {
    case "ORGANISATION":
      if (context.tenantId.trim() !== trimmedTenant) return "MISSING_TENANT";
      return null;
    case "ORG_UNIT":
      if (!context.orgUnitId.trim()) return "EMPTY_REFERENCE_ID";
      return null;
    case "TEAM":
      if (!context.teamId.trim()) return "EMPTY_REFERENCE_ID";
      return null;
    case "EVENT":
      if (!context.eventId.trim()) return "EMPTY_REFERENCE_ID";
      return null;
    case "SPONSOR":
      if (!context.sponsorId.trim()) return "EMPTY_REFERENCE_ID";
      return null;
    case "SYSTEM":
      if (!context.moduleKey.trim() || context.moduleKey.length > 64) {
        return "INVALID_MODULE_KEY";
      }
      return null;
    default: {
      const _exhaustive: never = context;
      return _exhaustive;
    }
  }
}
