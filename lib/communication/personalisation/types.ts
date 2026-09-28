/**
 * SCE-COMM-EVO-06 — canonical personalisation types.
 */

export const PERSONALISATION_FIELD_CATEGORIES = [
  "RECIPIENT",
  "PLAYER_PARENT",
  "TEAM",
  "ORGANISATION",
  "SEASON",
  "EVENT",
  "LOCATION",
  "TRAINING",
  "MATCH",
  "TOURNAMENT",
  "PARTICIPATION",
  "SENDER",
  "DATE",
  "LINKS",
] as const;

export type PersonalisationFieldCategory = (typeof PERSONALISATION_FIELD_CATEGORIES)[number];

export type PersonalisationValueType =
  | "TEXT"
  | "EMAIL"
  | "PHONE"
  | "URL"
  | "DATE"
  | "TIME"
  | "DATETIME"
  | "LIST";

export type PersonalisationFieldAvailability =
  | "AVAILABLE"
  | "CONTEXT_REQUIRED"
  | "AMBIGUOUS"
  | "UNAVAILABLE";

export type PersonalisationResolutionOutcome =
  | "RESOLVED"
  | "MISSING"
  | "AMBIGUOUS"
  | "UNAVAILABLE"
  | "UNAUTHORIZED";

export type PersonalisationMissingPolicyMode = "BLANK" | "REPLACEMENT" | "BLOCK_SEND";

export type PersonalisationFieldDefinition = {
  key: string;
  labelDe: string;
  category: PersonalisationFieldCategory;
  descriptionDe: string;
  valueType: PersonalisationValueType;
  /** When false, field is documented but not resolved yet. */
  implemented: boolean;
  /** Context kinds where field may resolve (empty = any organisation-level). */
  requiredContextKinds?: readonly (
    | "ORGANISATION"
    | "ORG_UNIT"
    | "TEAM"
    | "EVENT"
    | "SPONSOR"
    | "SYSTEM"
    | "DIRECT"
  )[];
  /** Event.type values required when context is EVENT. */
  requiredEventTypes?: readonly ("TRAINING" | "MATCH" | "TOURNAMENT" | "OTHER")[];
  allowedMissingPolicies: readonly PersonalisationMissingPolicyMode[];
  defaultMissingPolicy: PersonalisationMissingPolicyMode;
  /** Sensitive PII — gated by sender scope at preview/render. */
  requiresRecipientContactAccess?: boolean;
};

export type PersonalisationTokenOccurrence = {
  raw: string;
  key: string;
  start: number;
  end: number;
  missingPolicy: PersonalisationMissingPolicyMode;
  fallbackReplacement: string | null;
};

export type PersonalisationFieldDiagnostic = {
  key: string;
  labelDe: string;
  outcome: PersonalisationResolutionOutcome;
  messageDe?: string;
  usedFallback?: boolean;
  fallbackText?: string | null;
};

export type PersonalisationRenderResult = {
  text: string;
  diagnostics: PersonalisationFieldDiagnostic[];
  blocksSend: boolean;
  unknownTokens: string[];
};

export type PersonalisationValidateResult = {
  ok: boolean;
  syntaxErrors: string[];
  unknownTokens: string[];
  contextErrors: string[];
  recipientWarnings: string[];
  blocksSend: boolean;
};

export type PersonalisationRecipientRenderInput = {
  subjectPersonId: string;
  deliveryUserId: string;
  viaGuardianSubstitution: boolean;
  guardianPersonId: string | null;
};
