import type { PermissionKey } from "@/lib/permissions/permissions";
import type { SceActivityCreateKind } from "@/lib/sce/activity-composer/types";
import {
  personHasAnyPermission,
  resolveCreatePermissionKeysForActivityType,
} from "./capability-semantics";
import type {
  SceActivityClubGovernancePolicy,
  SceActivityEffectiveGovernance,
  SceActivityPublicationAuthority,
  SceActivityTypeGovernancePolicy,
} from "./types";
import {
  SCE_ACTIVITY_DEFAULT_APPROVAL_STRATEGY,
  SCE_ACTIVITY_DEFAULT_PUBLICATION_AUTHORITY,
} from "./types";

export type ResolveEffectiveGovernanceInput = {
  activityType: SceActivityCreateKind;
  personId: string;
  heldPermissions: ReadonlySet<PermissionKey>;
  clubPolicy?: SceActivityClubGovernancePolicy | null;
};

function findTypePolicy(
  clubPolicy: SceActivityClubGovernancePolicy | null | undefined,
  activityType: SceActivityCreateKind,
): SceActivityTypeGovernancePolicy | undefined {
  return clubPolicy?.activityTypes.find((t) => t.activityType === activityType);
}

function resolvePublicationAuthority(input: {
  typePolicy: SceActivityTypeGovernancePolicy | undefined;
  personId: string;
  mayCreate: boolean;
}): SceActivityPublicationAuthority {
  if (!input.mayCreate) {
    return SCE_ACTIVITY_DEFAULT_PUBLICATION_AUTHORITY;
  }
  const override = input.typePolicy?.creatorPolicies.find(
    (p) => p.personId === input.personId,
  );
  if (override) {
    return override.publicationAuthority;
  }
  return (
    input.typePolicy?.defaultPublicationAuthority ?? SCE_ACTIVITY_DEFAULT_PUBLICATION_AUTHORITY
  );
}

/**
 * Answers: may create, direct publish vs approval required, and validator pool.
 * Does not infer approval from create permission alone.
 */
export function resolveEffectiveActivityGovernance(
  input: ResolveEffectiveGovernanceInput,
): SceActivityEffectiveGovernance {
  const createKeys = resolveCreatePermissionKeysForActivityType(input.activityType);
  const mayCreate = personHasAnyPermission(input.heldPermissions, createKeys);
  const typePolicy = findTypePolicy(input.clubPolicy, input.activityType);
  const publicationAuthority = resolvePublicationAuthority({
    typePolicy,
    personId: input.personId,
    mayCreate,
  });

  return {
    activityType: input.activityType,
    personId: input.personId,
    mayCreate,
    publicationAuthority: mayCreate
      ? publicationAuthority
      : SCE_ACTIVITY_DEFAULT_PUBLICATION_AUTHORITY,
    approvalStrategy: SCE_ACTIVITY_DEFAULT_APPROVAL_STRATEGY,
    validatorPersonIds: typePolicy?.validatorPersonIds ?? [],
  };
}

/** When governance prop is omitted, Composer assumes legacy direct-publish create authority. */
export function resolveComposerEffectiveGovernanceOrDefault(input: {
  activityType: SceActivityCreateKind;
  effectiveGovernance?: SceActivityEffectiveGovernance | null;
}): SceActivityEffectiveGovernance {
  if (input.effectiveGovernance) {
    return input.effectiveGovernance;
  }
  return {
    activityType: input.activityType,
    personId: "composer-host-unresolved",
    mayCreate: true,
    publicationAuthority: SCE_ACTIVITY_DEFAULT_PUBLICATION_AUTHORITY,
    approvalStrategy: SCE_ACTIVITY_DEFAULT_APPROVAL_STRATEGY,
    validatorPersonIds: [],
  };
}
