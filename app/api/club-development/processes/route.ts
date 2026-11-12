import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { PERMISSIONS } from "@/lib/permissions/permissions";
import { requireStrategicApiContext } from "@/lib/permissions/require-strategic-api-context";
import { ClubDevelopmentProcessStatus, VisibilityScope } from "@prisma/client";

export async function GET() {
  const access = await requireStrategicApiContext([PERMISSIONS.INITIATIVES_VIEW]);
  if (!access.ok) return access.response;
  const rows = await prisma.clubDevelopmentProcess.findMany({
    where: { tenantId: access.context.tenantId },
    orderBy: { updatedAt: "desc" },
    select: {
      id: true,
      slug: true,
      title: true,
      status: true,
      approvalRequired: true,
      approvalStatus: true,
      owner: true,
    },
  });
  return NextResponse.json({ processes: rows });
}

export async function POST(req: NextRequest) {
  const access = await requireStrategicApiContext([PERMISSIONS.INITIATIVES_MANAGE]);
  if (!access.ok) return access.response;
  const body = await req.json().catch(() => ({}));
  const title = (body?.title ?? "").trim();
  if (!title) return NextResponse.json({ error: "Titel ist erforderlich." }, { status: 400 });
  const slug =
    (body?.slug ?? "").trim() ||
    title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

  const created = await prisma.clubDevelopmentProcess.create({
    data: {
      tenantId: access.context.tenantId,
      slug,
      title,
      summary: body?.summary?.trim() || null,
      description: body?.description?.trim() || null,
      status: ClubDevelopmentProcessStatus.DRAFT,
      visibilityScope: VisibilityScope.ORGANISATION,
      createdByUserId: access.context.actor.userId,
    },
    select: { id: true, slug: true, title: true },
  });
  return NextResponse.json({ process: created }, { status: 201 });
}
