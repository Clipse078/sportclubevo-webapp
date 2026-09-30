/**
 * SCE-DOMAIN-AUDIENCE-01 — fail-closed resolution/discovery errors.
 */

export type DomainAudienceErrorCode =
  | "SOURCE_NOT_REGISTERED"
  | "SOURCE_UNAUTHORIZED"
  | "CANDIDATE_RESOLUTION_FAILED"
  | "INVALID_REFERENCE";

export class DomainAudienceError extends Error {
  readonly code: DomainAudienceErrorCode;

  constructor(code: DomainAudienceErrorCode, message: string) {
    super(message);
    this.name = "DomainAudienceError";
    this.code = code;
  }
}
