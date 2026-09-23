/**
 * WORKSPACE-03 — access-management view model (canonical W02 semantics).
 */

import {
  WorkspaceAccessInheritanceMode,
  WorkspaceAccessSubjectType,
  WorkspaceResourceType,
} from "@prisma/client";

import { prisma } from "@/lib/db/prisma";
import type {
  WorkspaceAccessManagementViewModel,
  WorkspaceAccessSummaryViewModel,
  WorkspaceEffectiveAccessEntryDto,
  WorkspaceAccessGrantRuleDto,
  WorkspaceInheritedAccessEntryDto,
} from "@/lib/workspace/access/access-management-dto";
import {
  accessLevelDescriptionDe,
  accessLevelLabelDe,
  policyModeLabelDe,
} from "@/lib/workspace/access/access-management-labels";
import { audienceRefFromGrant, audienceKey } from "@/lib/workspace/access/audience";
import { toCanonicalResourceLevel } from "@/lib/workspace/access/resource-level";
import type { WorkspaceAccessGrantMutationFieldsDto } from "@/lib/workspace/access/access-management-dto";
import type { ResourceAccessChain } from "@/lib/workspace/access/effective-access";
import {
  buildDocumentAccessChain,
  buildFolderAccessChain,
  type WorkspaceResourceGraph,
} from "@/lib/workspace/access/resource-graph";
import { computeEffectiveAccessPaths } from "@/lib/workspace/access/effective-access";
import { explainEffectiveAccessPath } from "@/lib/workspace/access/explanation";
import {
  buildAccessInheritanceCopy,
  buildWhyAccessLabel,
} from "@/lib/workspace/access/access-provenance-labels";
import type { CanonicalResourceLevel } from "@/lib/workspace/access/resource-level";
import type {
  AccessPathSegment,
  AudienceRef,
  WorkspaceAccessGrantSnapshot,
} from "@/lib/workspace/access/types";
import {
  assertWorkspaceAccess,
  canWorkspaceManage,
  canWorkspaceView,
  getWorkspaceEffectiveAccessLevel,
  getWorkspaceResourceAclEffectiveAccessLevel,
  WorkspaceAuthorizationError,
  type WorkspaceActorContext,
} from "@/lib/workspace/access/workspace-authorization";

export class WorkspaceAccessManagementError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "WorkspaceAccessManagementError";
  }
}

type AudienceLabelResolver = {
  resolve(audience: AudienceRef): string;
};

function subjectTypeFromAudience(audience: AudienceRef): WorkspaceAccessGrantRuleDto["audienceKind"] {
  return audience.kind;
}

function explicitGrantsFromNode(
  grants: readonly WorkspaceAccessGrantSnapshot[],
): WorkspaceAccessGrantSnapshot[] {
  return grants.filter(
    (g) => g.subjectType !== WorkspaceAccessSubjectType.ORGANISATION,
  );
}

function configuredLevelOnResourceForAudience(
  chain: ResourceAccessChain,
  audience: AudienceRef,
): CanonicalResourceLevel | null {
  if (chain.resource.accessInheritanceMode !== WorkspaceAccessInheritanceMode.EXPLICIT) {
    return null;
  }
  for (const grant of chain.resource.grants) {
    if (audienceKey(audienceRefFromGrant(grant)) === audienceKey(audience)) {
      return toCanonicalResourceLevel(grant.accessLevel);
    }
  }
  return null;
}

function configuredGrantLevelForSegment(
  chain: ResourceAccessChain,
  segment: AccessPathSegment,
): CanonicalResourceLevel {
  if (segment.source !== "explicit_grant") {
    return segment.level;
  }
  const node =
    segment.resourceId === chain.resource.id
      ? chain.resource
      : chain.ancestors.find((ancestor) => ancestor.id === segment.resourceId);
  if (!node) {
    return segment.level;
  }
  for (const grant of node.grants) {
    if (audienceKey(audienceRefFromGrant(grant)) === audienceKey(segment.audience)) {
      return toCanonicalResourceLevel(grant.accessLevel);
    }
  }
  return segment.level;
}

function collectEffectiveAccessEntries(input: {
  chain: ResourceAccessChain;
  labels: AudienceLabelResolver;
  folderNameById: ReadonlyMap<string, string>;
  fallbackResourceName: string;
  maxVisible?: number;
}): WorkspaceEffectiveAccessEntryDto[] {
  const paths = computeEffectiveAccessPaths(input.chain);
  const pathCountByKey = new Map<string, number>();
  for (const path of paths) {
    const segment = path.segments.at(-1) ?? path.segments[0];
    if (!segment) continue;
    const key = `${audienceKey(segment.audience)}|${path.effectiveLevel}`;
    pathCountByKey.set(key, (pathCountByKey.get(key) ?? 0) + 1);
  }

  const effectiveAccess: WorkspaceEffectiveAccessEntryDto[] = [];
  const seen = new Set<string>();

  for (const path of paths) {
    const explanation = explainEffectiveAccessPath(path);
    const primarySegment = path.segments.at(-1) ?? path.segments[0];
    if (!primarySegment) continue;

    const audience = primarySegment.audience;
    const key = `${audienceKey(audience)}|${path.effectiveLevel}`;
    if (seen.has(key)) continue;
    seen.add(key);

    const resourceName =
      input.folderNameById.get(primarySegment.resourceId) ??
      input.fallbackResourceName;

    const configuredLevel =
      configuredLevelOnResourceForAudience(input.chain, audience) ??
      configuredGrantLevelForSegment(input.chain, primarySegment);
    const capped = configuredLevel !== path.effectiveLevel;

    const { sourceLabel, cappedByAncestor, ancestorCapLabel } = buildSourceLabel({
      explanationMode: explanation.mode,
      segmentSource: primarySegment.source,
      resourceName,
      configuredLevel,
      effectiveLevel: path.effectiveLevel,
    });

    const audienceLabel = input.labels.resolve(audience);
    const inheritedFromName =
      primarySegment.source === "inherited" ? resourceName : null;

    effectiveAccess.push({
      audienceKind: subjectTypeFromAudience(audience),
      audienceLabel,
      audienceKey: audienceKey(audience),
      effectiveLevel: path.effectiveLevel,
      effectiveLevelLabel: accessLevelLabelDe(path.effectiveLevel),
      configuredLevel: capped ? configuredLevel : null,
      configuredLevelLabel: capped ? accessLevelLabelDe(configuredLevel) : null,
      sourceLabel,
      whyLabel: buildWhyAccessLabel({
        audience,
        audienceLabel,
        explanationMode: explanation.mode,
        segmentSource: primarySegment.source,
        inheritedFromResourceName: inheritedFromName,
      }),
      cappedByAncestor,
      ancestorCapLabel,
      pathCount: pathCountByKey.get(key) ?? 1,
      isInherited: primarySegment.source === "inherited",
    });
  }

  if (input.maxVisible !== undefined) {
    return effectiveAccess.slice(0, input.maxVisible);
  }
  return effectiveAccess;
}

function buildSourceLabel(input: {
  explanationMode: ReturnType<typeof explainEffectiveAccessPath>["mode"];
  segmentSource: "explicit_grant" | "inherited";
  resourceName: string;
  configuredLevel: CanonicalResourceLevel;
  effectiveLevel: CanonicalResourceLevel;
}): { sourceLabel: string; cappedByAncestor: boolean; ancestorCapLabel: string | null } {
  const capped = input.configuredLevel !== input.effectiveLevel;
  const capLabel = capped
    ? `Durch übergeordneten Ordner auf ${accessLevelLabelDe(input.effectiveLevel)} begrenzt`
    : null;

  if (input.segmentSource === "inherited") {
    return {
      sourceLabel: `Geerbt von «${input.resourceName}»`,
      cappedByAncestor: capped,
      ancestorCapLabel: capLabel,
    };
  }

  if (input.explanationMode === "intersected" && capped) {
    return {
      sourceLabel: "Direkte Berechtigung, durch übergeordneten Ordner begrenzt",
      cappedByAncestor: true,
      ancestorCapLabel: capLabel,
    };
  }

  return {
    sourceLabel: "Direkt auf dieser Ressource",
    cappedByAncestor: capped,
    ancestorCapLabel: capLabel,
  };
}

function grantMutationFieldsFromSnapshot(
  grant: WorkspaceAccessGrantSnapshot,
): WorkspaceAccessGrantMutationFieldsDto {
  return {
    subjectType: grant.subjectType as WorkspaceAccessGrantMutationFieldsDto["subjectType"],
    accessLevel: grant.accessLevel as CanonicalResourceLevel,
    personId: grant.personId ?? null,
    orgUnitId: grant.orgUnitId ?? null,
    teamId: grant.teamId ?? null,
    roleFunctionKey: grant.roleFunctionKey ?? null,
    roleScopeOrgUnitId: grant.roleScopeOrgUnitId ?? null,
    roleScopeTeamId: grant.roleScopeTeamId ?? null,
  };
}

export function buildRestrictionSeedGrants(
  chain: ResourceAccessChain,
): WorkspaceAccessGrantMutationFieldsDto[] {
  for (let index = chain.ancestors.length - 1; index >= 0; index -= 1) {
    const node = chain.ancestors[index];
    if (
      node.accessInheritanceMode === WorkspaceAccessInheritanceMode.EXPLICIT &&
      node.grants.length > 0
    ) {
      return node.grants.map((grant) => grantMutationFieldsFromSnapshot(grant));
    }
  }
  return [
    {
      subjectType: WorkspaceAccessSubjectType.ORGANISATION,
      accessLevel: "VIEW",
    },
  ];
}

function mapExplicitGrantRules(
  grants: readonly WorkspaceAccessGrantSnapshot[],
  labels: AudienceLabelResolver,
): WorkspaceAccessGrantRuleDto[] {
  return grants.map((grant) => {
    const audience = audienceRefFromGrant(grant);
    const level = grant.accessLevel as CanonicalResourceLevel;
    return {
      id: grant.id,
      audienceKind: subjectTypeFromAudience(audience),
      audienceLabel: labels.resolve(audience),
      accessLevel: level,
      accessLevelLabel: accessLevelLabelDe(level),
      accessLevelDescription: accessLevelDescriptionDe(level),
      mutationFields: grantMutationFieldsFromSnapshot(grant),
      audienceKey: audienceKey(audience),
    };
  });
}

export function buildAccessManagementViewModel(input: {
  actor: WorkspaceActorContext;
  graph: WorkspaceResourceGraph;
  resource:
    | { resourceType: typeof WorkspaceResourceType.FOLDER; folderId: string; name: string }
    | {
        resourceType: typeof WorkspaceResourceType.DOCUMENT;
        documentId: string;
        name: string;
        folderId: string | null;
      };
  labels: AudienceLabelResolver;
  folderNameById: ReadonlyMap<string, string>;
}): WorkspaceAccessManagementViewModel {
  const resourceRef =
    input.resource.resourceType === WorkspaceResourceType.FOLDER
      ? {
          resourceType: WorkspaceResourceType.FOLDER,
          folderId: input.resource.folderId,
        }
      : {
          resourceType: WorkspaceResourceType.DOCUMENT,
          documentId: input.resource.documentId,
        };

  if (!canWorkspaceManage(input.actor, resourceRef)) {
    throw new WorkspaceAccessManagementError("Resource manage access required.");
  }

  const chain =
    input.resource.resourceType === WorkspaceResourceType.FOLDER
      ? buildFolderAccessChain(input.graph, input.resource.folderId)
      : buildDocumentAccessChain(input.graph, input.resource.documentId);

  if (!chain) {
    throw new WorkspaceAccessManagementError("Resource not found.");
  }

  const node = chain.resource;
  const parentId =
    input.resource.resourceType === WorkspaceResourceType.FOLDER
      ? node.parentFolderId
      : input.resource.folderId;

  const effectiveAccess = collectEffectiveAccessEntries({
    chain,
    labels: input.labels,
    folderNameById: input.folderNameById,
    fallbackResourceName: input.resource.name,
  });

  const inheritedAccess: WorkspaceInheritedAccessEntryDto[] = [];
  if (node.accessInheritanceMode === WorkspaceAccessInheritanceMode.INHERIT && parentId) {
    const parentChain =
      input.resource.resourceType === WorkspaceResourceType.FOLDER
        ? buildFolderAccessChain(input.graph, parentId)
        : buildFolderAccessChain(input.graph, parentId);

    if (parentChain) {
      const parentPaths = computeEffectiveAccessPaths(parentChain);
      for (const path of parentPaths.slice(0, 12)) {
        const segment = path.segments.at(-1);
        if (!segment) continue;
        inheritedAccess.push({
          audienceKind: subjectTypeFromAudience(segment.audience),
          audienceLabel: input.labels.resolve(segment.audience),
          level: path.effectiveLevel,
          levelLabel: accessLevelLabelDe(path.effectiveLevel),
          inheritedFromResourceId: segment.resourceId,
          inheritedFromResourceName:
            input.folderNameById.get(segment.resourceId) ?? "Übergeordneter Ordner",
          inheritedFromResourceType: segment.resourceType,
        });
      }
    }
  }

  const explicitSnapshot = explicitGrantsFromNode(node.grants);
  const orgGrant = node.grants.find(
    (g) => g.subjectType === WorkspaceAccessSubjectType.ORGANISATION,
  );

  const explicitGrants = mapExplicitGrantRules(
    node.accessInheritanceMode === WorkspaceAccessInheritanceMode.INHERIT
      ? []
      : [
          ...(orgGrant ? [orgGrant] : []),
          ...explicitSnapshot,
        ],
    input.labels,
  );

  const restrictionSeedGrants = buildRestrictionSeedGrants(chain);

  return {
    resource: {
      id:
        input.resource.resourceType === WorkspaceResourceType.FOLDER
          ? input.resource.folderId
          : input.resource.documentId,
      resourceType: input.resource.resourceType,
      name: input.resource.name,
      parentId,
      parentName: parentId ? input.folderNameById.get(parentId) ?? null : null,
    },
    policyMode: node.accessInheritanceMode,
    policyModeLabel: policyModeLabelDe(node.accessInheritanceMode),
    canManage: true,
    explicitGrants,
    effectiveAccess,
    inheritedAccess,
    inheritDescription:
      node.accessInheritanceMode === WorkspaceAccessInheritanceMode.INHERIT
        ? "Berechtigungen vom übergeordneten Ordner"
        : "Zugriff ist auf dieser Ressource zusätzlich eingeschränkt.",
    restrictionSeedGrants,
  };
}

export function buildAccessSummaryViewModel(input: {
  actor: WorkspaceActorContext;
  graph: WorkspaceResourceGraph;
  resource:
    | { resourceType: typeof WorkspaceResourceType.FOLDER; folderId: string }
    | { resourceType: typeof WorkspaceResourceType.DOCUMENT; documentId: string };
  labels: AudienceLabelResolver;
  folderNameById?: ReadonlyMap<string, string>;
  maxVisible?: number;
}): WorkspaceAccessSummaryViewModel | null {
  const resourceRef =
    input.resource.resourceType === WorkspaceResourceType.FOLDER
      ? {
          resourceType: WorkspaceResourceType.FOLDER,
          folderId: input.resource.folderId,
        }
      : {
          resourceType: WorkspaceResourceType.DOCUMENT,
          documentId: input.resource.documentId,
        };

  if (!canWorkspaceView(input.actor, resourceRef)) {
    return null;
  }

  const chain =
    input.resource.resourceType === WorkspaceResourceType.FOLDER
      ? buildFolderAccessChain(input.graph, input.resource.folderId)
      : buildDocumentAccessChain(input.graph, input.resource.documentId);

  if (!chain) {
    return null;
  }

  const node = chain.resource;
  const folderNameById = input.folderNameById ?? new Map<string, string>();
  const parentName = node.parentFolderId
    ? folderNameById.get(node.parentFolderId) ?? null
    : null;

  const maxVisible = input.maxVisible ?? 6;
  const allEffective = collectEffectiveAccessEntries({
    chain,
    labels: input.labels,
    folderNameById,
    fallbackResourceName: folderNameById.get(node.id) ?? "Ressource",
  });

  const visible = allEffective.slice(0, maxVisible);
  const moreCount = Math.max(0, allEffective.length - visible.length);

  const inheritanceCopy = buildAccessInheritanceCopy({
    policyMode: node.accessInheritanceMode,
    resourceType: input.resource.resourceType,
    parentName,
  });

  const actorEffectiveLevel = getWorkspaceEffectiveAccessLevel(
    input.actor,
    resourceRef,
  );
  const actorAclLevel = getWorkspaceResourceAclEffectiveAccessLevel(
    input.actor,
    resourceRef,
  );

  let actorAuthority: WorkspaceAccessSummaryViewModel["actorAuthority"] = null;
  if (actorEffectiveLevel) {
    if (
      input.actor.isCanonicalTenantClubAdmin &&
      actorEffectiveLevel === "MANAGE"
    ) {
      actorAuthority = {
        effectiveLevel: "MANAGE",
        effectiveLevelLabel: accessLevelLabelDe("MANAGE"),
        sourceKind: "CLUB_ADMIN",
        sourceLabel: "Club-Administrator",
        configuredActorLevel: actorAclLevel,
        configuredActorLevelLabel: actorAclLevel
          ? accessLevelLabelDe(actorAclLevel)
          : null,
      };
    } else {
      actorAuthority = {
        effectiveLevel: actorEffectiveLevel,
        effectiveLevelLabel: accessLevelLabelDe(actorEffectiveLevel),
        sourceKind: "ACL",
        sourceLabel: "Berechtigungen",
        configuredActorLevel: actorAclLevel,
        configuredActorLevelLabel: actorAclLevel
          ? accessLevelLabelDe(actorAclLevel)
          : null,
      };
    }
  }

  return {
    resourceId:
      input.resource.resourceType === WorkspaceResourceType.FOLDER
        ? input.resource.folderId
        : input.resource.documentId,
    resourceType: input.resource.resourceType,
    policyMode: node.accessInheritanceMode,
    policyModeHeadline: inheritanceCopy.headline,
    inheritanceDescription: inheritanceCopy.description,
    parentName,
    actorAuthority,
    effectiveAccess: visible,
    moreCount,
  };
}

async function createAudienceLabelResolver(
  tenantId: string,
): Promise<AudienceLabelResolver> {
  const [people, teams, orgUnits, tenant] = await Promise.all([
    prisma.person.findMany({
      where: { tenantId },
      select: { id: true, firstName: true, lastName: true },
    }),
    prisma.team.findMany({
      where: { tenantId },
      select: { id: true, name: true },
    }),
    prisma.orgUnit.findMany({
      where: { tenantId },
      select: { id: true, name: true },
    }),
    prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { name: true },
    }),
  ]);

  const personById = new Map(
    people.map((p) => [p.id, `${p.firstName} ${p.lastName}`.trim()]),
  );
  const teamById = new Map(teams.map((t) => [t.id, t.name]));
  const orgUnitById = new Map(orgUnits.map((o) => [o.id, o.name]));

  return {
    resolve(audience: AudienceRef): string {
      switch (audience.kind) {
        case "ORGANISATION":
          return tenant?.name?.trim() || "Organisation";
        case "ORG_UNIT":
          return orgUnitById.get(audience.orgUnitId) ?? "Organisationseinheit";
        case "TEAM":
          return teamById.get(audience.teamId) ?? "Team";
        case "ROLE":
          return audience.functionKey;
        case "PERSON":
          return personById.get(audience.personId) ?? "Person";
        default:
          return "Unbekannt";
      }
    },
  };
}

async function folderNameMap(tenantId: string): Promise<Map<string, string>> {
  const rows = await prisma.workspaceFolder.findMany({
    where: { tenantId },
    select: { id: true, name: true },
  });
  return new Map(rows.map((r) => [r.id, r.name]));
}

export async function loadWorkspaceAccessManagementViewModel(input: {
  actor: WorkspaceActorContext;
  resource:
    | { resourceType: typeof WorkspaceResourceType.FOLDER; folderId: string }
    | { resourceType: typeof WorkspaceResourceType.DOCUMENT; documentId: string };
}): Promise<WorkspaceAccessManagementViewModel> {
  const tenantId = input.actor.identity.tenantId;

  try {
    assertWorkspaceAccess(input.actor, "MANAGE", input.resource);
  } catch (error) {
    if (error instanceof WorkspaceAuthorizationError) {
      throw new WorkspaceAccessManagementError(error.message);
    }
    throw error;
  }

  const [labels, folderNames] = await Promise.all([
    createAudienceLabelResolver(tenantId),
    folderNameMap(tenantId),
  ]);

  if (input.resource.resourceType === WorkspaceResourceType.FOLDER) {
    const folder = await prisma.workspaceFolder.findFirst({
      where: { id: input.resource.folderId, tenantId },
      select: { id: true, name: true },
    });
    if (!folder) {
      throw new WorkspaceAccessManagementError("Resource not found.");
    }

    return buildAccessManagementViewModel({
      actor: input.actor,
      graph: input.actor.graph,
      resource: {
        resourceType: WorkspaceResourceType.FOLDER,
        folderId: folder.id,
        name: folder.name,
      },
      labels,
      folderNameById: folderNames,
    });
  }

  const document = await prisma.workspaceDocument.findFirst({
    where: { id: input.resource.documentId, tenantId },
    select: { id: true, name: true, folderId: true },
  });
  if (!document) {
    throw new WorkspaceAccessManagementError("Resource not found.");
  }

  return buildAccessManagementViewModel({
    actor: input.actor,
    graph: input.actor.graph,
    resource: {
      resourceType: WorkspaceResourceType.DOCUMENT,
      documentId: document.id,
      name: document.name,
      folderId: document.folderId,
    },
    labels,
    folderNameById: folderNames,
  });
}

export async function loadWorkspaceAccessSummaryViewModel(input: {
  actor: WorkspaceActorContext;
  resource:
    | { resourceType: typeof WorkspaceResourceType.FOLDER; folderId: string }
    | { resourceType: typeof WorkspaceResourceType.DOCUMENT; documentId: string };
}): Promise<WorkspaceAccessSummaryViewModel | null> {
  const tenantId = input.actor.identity.tenantId;
  const [labels, folderNames] = await Promise.all([
    createAudienceLabelResolver(tenantId),
    folderNameMap(tenantId),
  ]);
  return buildAccessSummaryViewModel({
    actor: input.actor,
    graph: input.actor.graph,
    resource: input.resource,
    labels,
    folderNameById: folderNames,
  });
}
