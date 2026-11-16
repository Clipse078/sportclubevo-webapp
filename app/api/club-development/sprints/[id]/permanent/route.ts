import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/db/prisma";
import { CD_SPRINT_API_COPY } from "@/lib/club-development/product-copy";
import { getDevelopmentSprintById } from "@/lib/club-development/sprints/queries";
import {
  deleteDevelopmentSprintPermanently,
  getDevelopmentSprintDeletionImpact,
} from "@/lib/club-development/sprints/sprint-delete-service";
import { PERMISSIONS } from "@/lib/permissions/permissions";
import { createEffectivePermissionResolver } from "@/lib/permissions/services/effective-permission-resolver";
import { resolveLiveTenantActor } from "@/lib/permissions/require-strategic-api-context";
import { buildVorhabenUndUmsetzungHref } from "@/lib/club-development/vereinsentwicklung-workspace-routing";

type RouteContext = { params: Promise<{ id: string }> };

export async function DELETE(request: NextRequest, { params }: RouteContext) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const tenantId = session.user.activeTenantId;
  const actorUserId = session.user.effectiveUserId ?? session.user.id;
  if (!tenantId || !actorUserId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const actor = await resolveLiveTenantActor(tenantId, actorUserId);
  if (!actor) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const sprint = await getDevelopmentSprintById(id, actor);
  if (!sprint) {
    return NextResponse.json({ error: CD_SPRINT_API_COPY.phaseNotFound }, { status: 404 });
  }

  const resolver = createEffectivePermissionResolver(prisma);
  const authorized = await resolver.hasTenantDeletionAuthority({
    userId: actorUserId,
    permission: PERMISSIONS.INITIATIVES_DELETE,
    tenantId,
  });

  if (!authorized) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const confirmed = request.nextUrl.searchParams.get("confirm") === "true";

  if (!confirmed) {
    const impact = await getDevelopmentSprintDeletionImpact(id, tenantId);
    if (!impact) {
      return NextResponse.json({ error: CD_SPRINT_API_COPY.phaseNotFound }, { status: 404 });
    }
    return NextResponse.json({ impact, requiresConfirmation: true });
  }

  const result = await deleteDevelopmentSprintPermanently(id, tenantId);
  if (!result) {
    return NextResponse.json({ error: CD_SPRINT_API_COPY.phaseNotFound }, { status: 404 });
  }

  const returnTo =
    request.nextUrl.searchParams.get("returnTo")?.trim() ||
    buildVorhabenUndUmsetzungHref("umsetzungsphasen");

  return NextResponse.json({
    ok: true,
    sprintId: result.sprintId,
    title: result.title,
    redirectTo: returnTo,
  });
}