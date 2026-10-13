/**
 * Canonical Activity Composer lifecycle (01B-R3) — form/commit validation vs governance approval.
 *
 * START → COMPOSE → optional SAVE DRAFT / RESUME → COMMIT VALIDATION →
 * publication authority decision (DIRECT_PUBLISH | APPROVAL_REQUIRED) → outcome.
 */
export const SCE_ACTIVITY_COMPOSER_LIFECYCLE_CANONICAL = [
  "START",
  "COMPOSE",
  "SAVE_DRAFT_OPTIONAL",
  "RESUME_OPTIONAL",
  "COMMIT_VALIDATION",
  "PUBLICATION_AUTHORITY_DECISION",
  "DIRECT_PUBLISH_OR_PENDING_APPROVAL",
] as const;

export const SCE_ACTIVITY_COMPOSER_PRODUCT_PRINCIPLE_R3 =
  "Saving preserves work. Submitting commits the activity. Publication follows the creator's effective governance policy.";
