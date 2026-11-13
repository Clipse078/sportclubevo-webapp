import "server-only";

import { prisma } from "@/lib/db/prisma";
import type { ActorContext } from "@/lib/visibility/actor-context";
import {
  applyVisibilityFilter,
  buildVisibilityWhere,
  canSeeEntity,
} from "@/lib/visibility/visibility-filter";
import { computeInitiativeProgressSnapshot } from "./initiative-progress";
import { computeTargetOutcomePercent } from "./target-outcome-progress";

type JsonInitiativeRef = { slug?: string; title?: string };

function parseLinkedInitiativeRefs(raw: unknown): JsonInitiativeRef[] {
  if (!Array.isArray(raw)) return [];
  return raw.filter((item) => item && typeof item === "object") as JsonInitiativeRef[];
}

export type StrategyTargetOverview = {
  id: string;
  title: string;
  status: string;
  outcomeProgressPercent: number | null;
  linkedInitiativeCount: number;
  deliveryProgressPercent: number | null;
  metrics: {
    id: string;
    label: string;
    targetValue: number;
    currentValue: number;
    direction: string;
    outcomePercent: number | null;
  }[];
};

export async function loadStrategyOverview(
  actor: ActorContext,
): Promise<{ targets: StrategyTargetOverview[] }> {
  if (
    !actor.tenantId ||
    !actor.permissionKeys.some((key) =>
      ["targets.view", "targets.manage", "initiatives.view", "initiatives.manage"].includes(key),
    )
  ) {
    return { targets: [] };
  }

  const tenantId = actor.tenantId;

  const [targetRows, linkRows, initiatives] = await Promise.all([
    prisma.target.findMany({
      where: { tenantId, ...buildVisibilityWhere(actor) },
      select: {
        id: true,
        title: true,
        status: true,
        linkedInitiativeRefs: true,
        visibilityScope: true,
        createdByUserId: true,
        visibleRoleRefs: true,
        visibleUserRefs: true,
        visibleTeamRefs: true,
        visibleOrgUnitRefs: true,
        visiblePersonRefs: true,
        visibleTargetGroupRefs: true,
        metrics: {
          select: {
            id: true,
            label: true,
            direction: true,
            targetValue: true,
            currentValue: true,
          },
          orderBy: { sortOrder: "asc" },
        },
      },
      orderBy: [{ status: "asc" }, { createdAt: "desc" }],
    }),
    prisma.initiativeTargetLink.findMany({
      where: { tenantId },
      select: { targetId: true, initiativeId: true },
    }),
    prisma.initiative.findMany({
      where: { tenantId },
      select: {
        id: true,
        slug: true,
        visibilityScope: true,
        createdByUserId: true,
        visibleRoleRefs: true,
        visibleUserRefs: true,
        visibleTeamRefs: true,
        visibleOrgUnitRefs: true,
        visiblePersonRefs: true,
        visibleTargetGroupRefs: true,
      },
    }),
  ]);

  const visibleTargets = applyVisibilityFilter(targetRows, actor);
  const visibleInitiatives = applyVisibilityFilter(initiatives, actor);
  const visibleInitiativeIds = new Set(visibleInitiatives.map((i) => i.id));
  const slugToInitiativeId = new Map(
    visibleInitiatives.filter((i) => i.slug).map((i) => [i.slug, i.id]),
  );

  const linksByTarget = new Map<string, Set<string>>();
  for (const link of linkRows) {
    if (!visibleInitiativeIds.has(link.initiativeId)) continue;
    const set = linksByTarget.get(link.targetId) ?? new Set<string>();
    set.add(link.initiativeId);
    linksByTarget.set(link.targetId, set);
  }

  const targets: StrategyTargetOverview[] = [];

  for (const target of visibleTargets) {
    const initiativeIds = new Set(linksByTarget.get(target.id) ?? []);
    for (const ref of parseLinkedInitiativeRefs(target.linkedInitiativeRefs)) {
      if (ref.slug) {
        const id = slugToInitiativeId.get(ref.slug);
        if (id) initiativeIds.add(id);
      }
    }

    let deliveryTotal = 0;
    let deliverySum = 0;
    let deliveryCount = 0;
    for (const initiativeId of initiativeIds) {
      const snap = await computeInitiativeProgressSnapshot(tenantId, initiativeId);
      if (snap.eligibleCount > 0) {
        deliverySum += snap.progress;
        deliveryCount += 1;
      }
      deliveryTotal += 1;
    }

    const outcomeProgressPercent = computeTargetOutcomePercent(target.metrics);

    targets.push({
      id: target.id,
      title: target.title,
      status: target.status,
      outcomeProgressPercent,
      linkedInitiativeCount: deliveryTotal,
      deliveryProgressPercent:
        deliveryCount > 0 ? Math.round(deliverySum / deliveryCount) : null,
      metrics: target.metrics.map((m) => ({
        id: m.id,
        label: m.label,
        targetValue: m.targetValue,
        currentValue: m.currentValue,
        direction: m.direction,
        outcomePercent: computeTargetOutcomePercent([
          {
            targetValue: m.targetValue,
            currentValue: m.currentValue,
            direction: m.direction,
          },
        ]),
      })),
    });
  }

  return { targets };
}

export async function canActorSeeInitiative(actor: ActorContext, initiativeId: string) {
  if (!actor.tenantId) return false;
  const row = await prisma.initiative.findFirst({
    where: { id: initiativeId, tenantId: actor.tenantId },
    select: {
      visibilityScope: true,
      createdByUserId: true,
      visibleRoleRefs: true,
      visibleUserRefs: true,
      visibleTeamRefs: true,
      visibleOrgUnitRefs: true,
      visiblePersonRefs: true,
      visibleTargetGroupRefs: true,
    },
  });
  if (!row) return false;
  return canSeeEntity(row, actor);
}
