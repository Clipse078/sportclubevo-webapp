import { NextResponse } from "next/server";

import { prisma } from "@/lib/db/prisma";
import { requireTenantDocumentationApiActor } from "@/lib/tenant-documentation/tenant-documentation-api-actor";
import { ensureDefaultSpace } from "@/lib/tenant-documentation/page-tree-service";

export async function GET() {
  const access = await requireTenantDocumentationApiActor();
  if (!access.ok) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }

  await ensureDefaultSpace(access.tenantId, access.actorUserId);

  const spaces = await prisma.tenantDocumentationSpace.findMany({
    where: { tenantId: access.tenantId },
    orderBy: { title: "asc" },
    select: { id: true, slug: true, title: true, description: true },
  });

  return NextResponse.json({ spaces });
}