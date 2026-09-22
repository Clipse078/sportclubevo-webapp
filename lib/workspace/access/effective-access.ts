/**
 * WORKSPACE-01 — pure effective access evaluation (inheritance + intersection).
 */

import {
  WorkspaceAccessInheritanceMode,
  WorkspaceAccessSubjectType,
  WorkspaceResourceType,
} from "@prisma/client";

import {
  audienceRefFromGrant,
  isAudienceStructurallyWithinParent,
  mergeRequiredAudiences,
} from "@/lib/workspace/access/audience";
import {
  intersectResourceLevels,
  toCanonicalResourceLevel,
  type CanonicalResourceLevel,
} from "@/lib/workspace/access/resource-level";
import type {
  AccessPathSegment,
  AudienceRef,
  EffectiveAccessPath,
  WorkspaceAccessGrantSnapshot,
  WorkspaceResourceAccessNode,
} from "@/lib/workspace/access/types";

export class WorkspaceAccessBroadeningError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "WorkspaceAccessBroadeningError";
  }
}

export type ResourceAccessChain = {
  /** Root → … → resource (includes resource). */
  ancestors: readonly WorkspaceResourceAccessNode[];
  resource: WorkspaceResourceAccessNode;
};

function organisationGrant(
  grants: readonly WorkspaceAccessGrantSnapshot[],
): WorkspaceAccessGrantSnapshot | undefined {
  return grants.find((g) => g.subjectType === WorkspaceAccessSubjectType.ORGANISATION);
}

function explicitGrants(
  grants: readonly WorkspaceAccessGrantSnapshot[],
): WorkspaceAccessGrantSnapshot[] {
  return grants.filter((g) => g.subjectType !== WorkspaceAccessSubjectType.ORGANISATION);
}

function capLevelAlongChain(
  ancestorCaps: readonly CanonicalResourceLevel[],
  grantLevel: CanonicalResourceLevel,
): CanonicalResourceLevel {
  let level = grantLevel;
  for (const cap of ancestorCaps) {
    level = intersectResourceLevels(level, cap);
  }
  return level;
}

function ancestorAudienceRequirements(
  chain: ResourceAccessChain,
): AudienceRef[] {
  const required: AudienceRef[] = [];
  for (const node of chain.ancestors) {
    if (node.accessInheritanceMode === WorkspaceAccessInheritanceMode.INHERIT) {
      continue;
    }
    for (const grant of explicitGrants(node.grants)) {
      required.push(audienceRefFromGrant(grant));
    }
  }
  return required;
}

function ancestorLevelCaps(chain: ResourceAccessChain): CanonicalResourceLevel[] {
  const caps: CanonicalResourceLevel[] = [];
  for (const node of chain.ancestors) {
    const org = organisationGrant(node.grants);
    if (org) {
      caps.push(toCanonicalResourceLevel(org.accessLevel));
    }
    for (const grant of explicitGrants(node.grants)) {
      caps.push(toCanonicalResourceLevel(grant.accessLevel));
    }
  }
  return caps;
}

function validateExplicitChildGrants(
  chain: ResourceAccessChain,
  parentEffectiveAudiences: AudienceRef[],
): void {
  const resource = chain.resource;
  if (resource.accessInheritanceMode === WorkspaceAccessInheritanceMode.INHERIT) {
    return;
  }

  const parentChainNode = parentChain(chain);
  const parentPaths = parentChainNode
    ? computeEffectiveAccessPaths(parentChainNode)
    : [];
  const parentEnvelopes =
    parentPaths.length > 0
      ? parentPaths.flatMap((p) => p.requiredAudiences)
      : parentEffectiveAudiences;

  const parentEnvelope =
    parentEnvelopes.length > 0
      ? parentEnvelopes[parentEnvelopes.length - 1]!
      : ({ kind: "ORGANISATION" } as AudienceRef);

  for (const grant of resource.grants) {
    const childAudience = audienceRefFromGrant(grant);
    if (!isAudienceStructurallyWithinParent(parentEnvelope, childAudience)) {
      throw new WorkspaceAccessBroadeningError(
        "Child grant would broaden effective audience beyond parent envelope.",
      );
    }
  }
}

function parentChain(chain: ResourceAccessChain): ResourceAccessChain | null {
  const parent = chain.ancestors.at(-1);
  if (!parent) return null;
  return {
    ancestors: chain.ancestors.slice(0, -1),
    resource: parent,
  };
}

export function computeEffectiveAccessPaths(
  chain: ResourceAccessChain,
): EffectiveAccessPath[] {
  const ancestorReq = ancestorAudienceRequirements(chain);
  const ancestorCaps = ancestorLevelCaps(chain);
  const resource = chain.resource;

  if (resource.accessInheritanceMode === WorkspaceAccessInheritanceMode.INHERIT) {
    const parent = parentChain(chain);
    if (parent) {
      const inherited = computeEffectiveAccessPaths(parent);
      return inherited.map((path) => ({
        ...path,
        segments: path.segments.map((s) => ({
          ...s,
          source: "inherited" as const,
        })),
      }));
    }

    const org = organisationGrant(resource.grants);
    const baseLevel = org
      ? toCanonicalResourceLevel(org.accessLevel)
      : ("VIEW" as CanonicalResourceLevel);

    return [
      {
        requiredAudiences: org ? [{ kind: "ORGANISATION" }] : [],
        effectiveLevel: baseLevel,
        segments: [],
      },
    ];
  }

  validateExplicitChildGrants(chain, ancestorReq);

  const paths: EffectiveAccessPath[] = [];
  const grants =
    explicitGrants(resource.grants).length > 0
      ? explicitGrants(resource.grants)
      : resource.grants;

  for (const grant of grants) {
    const audience = audienceRefFromGrant(grant);
    const grantLevel = toCanonicalResourceLevel(grant.accessLevel);
    const effectiveLevel = capLevelAlongChain(ancestorCaps, grantLevel);
    const requiredAudiences = mergeRequiredAudiences(ancestorReq, audience);

    const segment: AccessPathSegment = {
      audience,
      level: effectiveLevel,
      source: "explicit_grant",
      resourceId: resource.id,
      resourceType: resource.resourceType,
    };

    paths.push({
      requiredAudiences,
      effectiveLevel,
      segments: [segment],
    });
  }

  if (paths.length === 0) {
    paths.push({
      requiredAudiences: [...ancestorReq],
      effectiveLevel: capLevelAlongChain(ancestorCaps, "VIEW"),
      segments: [],
    });
  }

  return paths;
}

export function legacyRootOrganisationPolicy(): {
  accessInheritanceMode: WorkspaceAccessInheritanceMode;
  organisationView: true;
} {
  return {
    accessInheritanceMode: WorkspaceAccessInheritanceMode.EXPLICIT,
    organisationView: true,
  };
}

export function legacyChildInheritPolicy(): {
  accessInheritanceMode: WorkspaceAccessInheritanceMode;
} {
  return {
    accessInheritanceMode: WorkspaceAccessInheritanceMode.INHERIT,
  };
}

export function documentVersionInheritsDocumentSecurity(): true {
  return true;
}

export function buildDefaultRootResourcePolicy(input: {
  tenantId: string;
  resourceType: WorkspaceResourceType;
  resourceId: string;
  creatorPersonId?: string | null;
}): {
  accessInheritanceMode: WorkspaceAccessInheritanceMode;
  grants: Omit<WorkspaceAccessGrantSnapshot, "id" | "createdAt" | "updatedAt">[];
} {
  const folderId =
    input.resourceType === WorkspaceResourceType.FOLDER ? input.resourceId : null;
  const documentId =
    input.resourceType === WorkspaceResourceType.DOCUMENT ? input.resourceId : null;

  const grants: Omit<
    WorkspaceAccessGrantSnapshot,
    "id" | "createdAt" | "updatedAt"
  >[] = [
    {
      tenantId: input.tenantId,
      resourceType: input.resourceType,
      folderId,
      documentId,
      subjectType: WorkspaceAccessSubjectType.ORGANISATION,
      accessLevel: "VIEW",
      personId: null,
      orgUnitId: null,
      teamId: null,
      roleFunctionKey: null,
      roleScopeOrgUnitId: null,
      roleScopeTeamId: null,
    },
  ];

  if (input.creatorPersonId) {
    grants.push({
      tenantId: input.tenantId,
      resourceType: input.resourceType,
      folderId,
      documentId,
      subjectType: WorkspaceAccessSubjectType.PERSON,
      accessLevel: "MANAGE",
      personId: input.creatorPersonId,
      orgUnitId: null,
      teamId: null,
      roleFunctionKey: null,
      roleScopeOrgUnitId: null,
      roleScopeTeamId: null,
    });
  }

  return {
    accessInheritanceMode: WorkspaceAccessInheritanceMode.EXPLICIT,
    grants,
  };
}

export function buildDefaultChildResourcePolicy(): {
  accessInheritanceMode: WorkspaceAccessInheritanceMode;
} {
  return {
    accessInheritanceMode: WorkspaceAccessInheritanceMode.INHERIT,
  };
}
