import { NextResponse } from "next/server";

import { listAccessiblePageTree } from "@/lib/tenant-documentation/page-tree-service";
import { requireTenantDocumentationApiActor } from "@/lib/tenant-documentation/tenant-documentation-api-actor";
import { prisma } from "@/lib/db/prisma";

type RouteContext = { params: Promise<{ spaceId: string }> };

export async function GET(_request: Request, context: RouteContext) {
  const access = await requireTenantDocumentationApiActor();
  if (!access.ok) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }

  const { spaceId } = await context.params;
  const space = await prisma.tenantDocumentationSpace.findFirst({
    where: { id: spaceId, tenantId: access.tenantId },
    select: { id: true, title: true, slug: true },
  });
  if (!space) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const tree = await listAccessiblePageTree(access.actor, spaceId);
  return NextResponse.json({ space, tree });
}