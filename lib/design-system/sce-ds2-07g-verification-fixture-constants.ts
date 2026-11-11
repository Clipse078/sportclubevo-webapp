/**
 * SCE-DS2-07G — deterministic isolated verification fixture identity.
 * @see docs/design-system-v2/27-ds2-07g-fixture-isolation-strategy.md
 */

export const SCE_DS2_07G_VERIFICATION_PREFIX = "sce-ds2-07g-vfy-";

export const SCE_DS2_07G_VERIFICATION_DATABASE_NAME = "sce_ds2_07g_verification";

export const SCE_DS2_07G_VERIFICATION_TENANT_KEY = "sce-ds2-07g-verification-club";

export const SCE_DS2_07G_VERIFICATION_TENANT_ID = `${SCE_DS2_07G_VERIFICATION_PREFIX}tenant`;

export const SCE_DS2_07G_VERIFICATION_USER_ID = `${SCE_DS2_07G_VERIFICATION_PREFIX}user`;

export const SCE_DS2_07G_VERIFICATION_PERSONA_EMAIL =
  `sce-ds2-07g-verification@${"example.test"}`;

// pragma: allowlist secret
export const SCE_DS2_07G_VERIFICATION_PERSONA_PASSWORD_ENV = "SCE_DS2_07G_VERIFICATION_PERSONA_PASSWORD";

// pragma: allowlist secret
export const SCE_DS2_07G_VERIFICATION_CONFIRMATION =
  "SCE_DS2_07G_ISOLATED_VERIFICATION_MUTATION";

export const SCE_DS2_07G_VERIFICATION_OPERATION_AUTHORIZATION =
  "sce-ds2-07g-verification:local";

export const SCE_DS2_07G_VERIFICATION_FIXTURE_IDS = {
  personId: `${SCE_DS2_07G_VERIFICATION_PREFIX}person`,
  orgUnitId: `${SCE_DS2_07G_VERIFICATION_PREFIX}org-unit`,
  clubAdminRoleId: `${SCE_DS2_07G_VERIFICATION_PREFIX}role-club-admin`,
  requirementId: `${SCE_DS2_07G_VERIFICATION_PREFIX}requirement`,
  recipientId: `${SCE_DS2_07G_VERIFICATION_PREFIX}recipient`,
  campaignId: `${SCE_DS2_07G_VERIFICATION_PREFIX}campaign`,
  templateId: `${SCE_DS2_07G_VERIFICATION_PREFIX}template`,
  newsArticleId: `${SCE_DS2_07G_VERIFICATION_PREFIX}news`,
  initiativeSlug: "ds2-07g-verification-initiative",
  initiativeId: `${SCE_DS2_07G_VERIFICATION_PREFIX}initiative`,
  meetingSlug: "ds2-07g-verification-meeting",
  meetingId: `${SCE_DS2_07G_VERIFICATION_PREFIX}meeting`,
  targetId: `${SCE_DS2_07G_VERIFICATION_PREFIX}target`,
  legalEntityId: `${SCE_DS2_07G_VERIFICATION_PREFIX}legal-entity`,
  importKey: "ds2-07g-verification-import",
  bankImportId: `${SCE_DS2_07G_VERIFICATION_PREFIX}bank-import`,
  conversationId: `${SCE_DS2_07G_VERIFICATION_PREFIX}conversation`,
} as const;

export type SceDs207gVerificationFixtureManifest = {
  version: string;
  seededAt: string;
  databaseFingerprint: string;
  tenantId: string;
  tenantKey: string;
  verificationPersonaEmailEnv: string;
  fixtures: Record<string, string>;
};
