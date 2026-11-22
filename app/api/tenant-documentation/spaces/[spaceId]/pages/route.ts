import { NextResponse } from "next/server";

import { PERMISSIONS } from "@/lib/permissions/permissions";
import {
  createDocumentationPage,
  slugifyDocumentationTitle,
} from "@/lib/tenant-documentation/page-tree-service";
import { requireTenantDocumentationApiActor } from "@/lib/tenant-documentation/tenant-documentation-api-actor";
import { prisma } from "@/lib/db/prisma";
import { TenantDocumentationAccessLevel } from "@prisma/client";
import { accessLevelPermits } from "@/lib/tenant-documentation/authorization";
import { resolvePageEffectiveAccess } from "@/lib/tenant-documentation/page-access-service";

type RouteContext = { params: Promise<{ spaceId: string }> };

export async function POST(request: Request, context: RouteContext) {
  const access = await requireTenantDocumentationApiActor(
    PERMISSIONS.TENANT_DOCUMENTATION_EDIT,
  );
  if (!access.ok) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }

  const { spaceId } = await context.params;
  const space = await prisma.tenantDocumentationSpace.findFirst({
    where: { id: spaceId, tenantId: access.tenantId },
    select: { id: true },
  });
  if (!space) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  let body: { title?: string; parentId?: string | null };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const title = body.title?.trim();
  if (!title) {
    return NextResponse.json({ error: "Title required" }, { status: 400 });
  }

  const parentId = body.parentId ?? null;
  if (parentId) {
    const parent = await prisma.tenantDocumentationPage.findFirst({
      where: { id: parentId, tenantId: access.tenantId, spaceId },
      select: { id: true },
    });
    if (!parent) {
      return NextResponse.json({ error: "Parent not found" }, { status: 404 });
    }
    const parentAccess = await resolvePageEffectiveAccess(access.actor, parentId);
    if (!accessLevelPermits(parentAccess, TenantDocumentationAccessLevel.EDIT)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
  }

  const baseSlug = slugifyDocumentationTitle(title);
  let slug = baseSlug;
  let suffix = 2;
  while (
    await prisma.tenantDocumentationPage.findFirst({
      where: { spaceId, parentId, slug },
      select: { id: true },
    })
  ) {
    slug = `${baseSlug}-${suffix}`;
    suffix += 1;
  }

  try {
    const page = await createDocumentationPage({
      actor: access.actor,
      actorUserId: access.actorUserId,
      spaceId,
      parentId,
      title,
      slug,
    });
    return NextResponse.json({
      page: { id: page.id, title: page.title, href: `/dashboard/dokumentation/p/${page.id}` },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Create failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}