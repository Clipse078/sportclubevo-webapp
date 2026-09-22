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
import {
  buildDocumentAccessChain,
  buildFolderAccessChain,
  type WorkspaceResourceGraph,
} from "@/lib/workspace/access/resource-graph";
import { computeEffectiveAccessPaths } from "@/lib/workspace/access/effective-access";
import { explainEffectiveAccessPath } from "@/lib/workspace/access/explanation";
import type { CanonicalResourceLevel } from "@/lib/workspace/access/resource-level";
import type { AudienceRef, WorkspaceAccessGrantSnapshot } from "@/lib/workspace/access/types";
import {
  assertWorkspaceAccess,
  canWorkspaceManage,
  canWorkspaceView,
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

  const paths = computeEffectiveAccessPaths(chain);
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
      input.resource.name;

    const { sourceLabel, cappedByAncestor, ancestorCapLabel } = buildSourceLabel({
      explanationMode: explanation.mode,
      segmentSource: primarySegment.source,
      resourceName,
      configuredLevel: primarySegment.level,
      effectiveLevel: path.effectiveLevel,
    });

    effectiveAccess.push({
      audienceKind: subjectTypeFromAudience(audience),
      audienceLabel: input.labels.resolve(audience),
      effectiveLevel: path.effectiveLevel,
      effectiveLevelLabel: accessLevelLabelDe(path.effectiveLevel),
      sourceLabel,
      cappedByAncestor,
      ancestorCapLabel,
    });
  }

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
  };
}

export function buildAccessSummaryViewModel(input: {
  actor: WorkspaceActorContext;
  graph: WorkspaceResourceGraph;
  resource:
    | { resourceType: typeof WorkspaceResourceType.FOLDER; folderId: string }
    | { resourceType: typeof WorkspaceResourceType.DOCUMENT; documentId: string };
  labels: AudienceLabelResolver;
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

  const paths = computeEffectiveAccessPaths(chain);
  const maxVisible = input.maxVisible ?? 2;
  const entries = paths.slice(0, maxVisible + 5).map((path) => {
    const segment = path.segments.at(-1);
    const audience = segment?.audience ?? ({ kind: "ORGANISATION" } as AudienceRef);
    return {
      audienceLabel: input.labels.resolve(audience),
      levelLabel: accessLevelLabelDe(path.effectiveLevel),
    };
  });

  const unique: { audienceLabel: string; levelLabel: string }[] = [];
  const seen = new Set<string>();
  for (const entry of entries) {
    const key = `${entry.audienceLabel}|${entry.levelLabel}`;
    if (seen.has(key)) continue;
    seen.add(key);
    unique.push(entry);
  }

  const visible = unique.slice(0, maxVisible);
  const moreCount = Math.max(0, unique.length - visible.length);

  return {
    resourceId:
      input.resource.resourceType === WorkspaceResourceType.FOLDER
        ? input.resource.folderId
        : input.resource.documentId,
    resourceType: input.resource.resourceType,
    entries: visible,
    moreCount,
  };
}

async function createAudienceLabelResolver(
  tenantId: string,
): Promise<AudienceLabelResolver> {
  const [people, teams, orgUnits] = await Promise.all([
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
          return "Organisation";
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
  const labels = await createAudienceLabelResolver(input.actor.identity.tenantId);
  return buildAccessSummaryViewModel({
    actor: input.actor,
    graph: input.actor.graph,
    resource: input.resource,
    labels,
  });
}
