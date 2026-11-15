import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { TargetCategory, TargetStatus, TargetPeriod, VisibilityScope } from "@prisma/client";
import { getTargets } from "@/lib/targets/queries";
import { PERMISSIONS } from "@/lib/permissions/permissions";
import { requireStrategicApiContext } from "@/lib/permissions/require-strategic-api-context";
import { normalizeTargetMetricsFromBody } from "@/lib/targets/target-metric-payload";

export async function GET() {
  const access = await requireStrategicApiContext([
    PERMISSIONS.TARGETS_VIEW,
    PERMISSIONS.TARGETS_MANAGE,
  ]);
  if (!access.ok) return access.response;
  const targets = await getTargets(access.context.actor);
  return NextResponse.json({ targets });
}

export async function POST(request: NextRequest) {
  const access = await requireStrategicApiContext([PERMISSIONS.TARGETS_MANAGE]);
  if (!access.ok) return access.response;
  const { actor, tenantId } = access.context;

  try {
    const body = await request.json().catch(() => ({}));

    const title = (body?.title ?? "").trim();
    if (!title) {
      return NextResponse.json({ error: "Titel ist erforderlich." }, { status: 400 });
    }

    const validCategories = Object.values(TargetCategory);
    const category: TargetCategory = validCategories.includes(body?.category)
      ? (body.category as TargetCategory)
      : TargetCategory.SPORTLICHE_ENTWICKLUNG;

    const validStatuses = Object.values(TargetStatus);
    const status: TargetStatus = validStatuses.includes(body?.status)
      ? (body.status as TargetStatus)
      : TargetStatus.ACTIVE;

    const validPeriods = Object.values(TargetPeriod);
    const period: TargetPeriod = validPeriods.includes(body?.period)
      ? (body.period as TargetPeriod)
      : TargetPeriod.SEASON;

    const validScopes = Object.values(VisibilityScope);
    const visibilityScope: VisibilityScope = validScopes.includes(body?.visibilityScope as VisibilityScope)
      ? (body.visibilityScope as VisibilityScope)
      : VisibilityScope.ORGANISATION;

    const metricsResult = normalizeTargetMetricsFromBody(body?.metrics);
    if (!metricsResult.ok) {
      return NextResponse.json({ error: metricsResult.error }, { status: 400 });
    }

    const created = await prisma.target.create({
      data: {
        tenantId,
        title,
        description: body?.description?.trim() || null,
        category,
        status,
        period,
        periodLabel: body?.periodLabel?.trim() || null,
        moduleKey: body?.moduleKey?.trim() || null,
        sportCategory: body?.sportCategory?.trim() || null,
        ageGroupHint: body?.ageGroupHint?.trim() || null,
        startsAt: body?.startsAt ? new Date(body.startsAt) : null,
        endsAt: body?.endsAt ? new Date(body.endsAt) : null,
        nudgeJson: body?.nudgeJson ?? null,
        visibilityScope,
        createdByUserId: actor.userId,
        visibleOrgUnitRefs: Array.isArray(body?.visibleOrgUnitRefs) ? body.visibleOrgUnitRefs : undefined,
        visibleRoleRefs: Array.isArray(body?.visibleRoleRefs) ? body.visibleRoleRefs : undefined,
        visibleUserRefs: Array.isArray(body?.visibleUserRefs) ? body.visibleUserRefs : undefined,
        // Phase D: target group refs for resolved-member visibility
        visibleTargetGroupRefs: Array.isArray(body?.visibleTargetGroupRefs) ? body.visibleTargetGroupRefs : undefined,
        metrics: {
          create: metricsResult.metrics.map((m) => ({
            label: m.label,
            type: m.type,
            direction: m.direction,
            targetValue: m.targetValue,
            currentValue: m.currentValue,
            unit: m.unit,
            notes: m.notes,
            sortOrder: m.sortOrder,
          })),
        },
      },
      select: { id: true, title: true },
    });

    return NextResponse.json({ target: created }, { status: 201 });
  } catch (error) {
    console.error("Create target failed:", error);
    return NextResponse.json({ error: "Ziel konnte nicht erstellt werden." }, { status: 500 });
  }
}
