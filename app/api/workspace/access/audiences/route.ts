import { NextRequest, NextResponse } from "next/server";

import { prisma } from "@/lib/db/prisma";
import { PERSON_FUNCTION_OPTIONS } from "@/lib/people/functions";
import { PERMISSIONS } from "@/lib/permissions/permissions";
import { requireWorkspaceApiActor } from "@/lib/workspace/workspace-api-actor";

export async function GET(request: NextRequest) {
  const access = await requireWorkspaceApiActor(PERMISSIONS.WORKSPACE_MANAGE);
  if (!access.ok) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }

  const tenantId = access.tenantId;
  const q = request.nextUrl.searchParams.get("q")?.trim() ?? "";
  const type = request.nextUrl.searchParams.get("type")?.trim() ?? "PERSON";

  const take = 20;

  if (type === "PERSON") {
    const people = await prisma.person.findMany({
      where: {
        tenantId,
        ...(q
          ? {
              OR: [
                { firstName: { contains: q, mode: "insensitive" } },
                { lastName: { contains: q, mode: "insensitive" } },
              ],
            }
          : {}),
      },
      select: { id: true, firstName: true, lastName: true },
      take,
      orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
    });
    return NextResponse.json({
      results: people.map((p) => ({
        type: "PERSON",
        id: p.id,
        label: `${p.firstName} ${p.lastName}`.trim(),
      })),
    });
  }

  if (type === "TEAM") {
    const teams = await prisma.team.findMany({
      where: {
        tenantId,
        ...(q ? { name: { contains: q, mode: "insensitive" } } : {}),
      },
      select: { id: true, name: true },
      take,
      orderBy: { name: "asc" },
    });
    return NextResponse.json({
      results: teams.map((t) => ({ type: "TEAM", id: t.id, label: t.name })),
    });
  }

  if (type === "ORG_UNIT") {
    const orgUnits = await prisma.orgUnit.findMany({
      where: {
        tenantId,
        ...(q ? { name: { contains: q, mode: "insensitive" } } : {}),
      },
      select: { id: true, name: true },
      take,
      orderBy: { name: "asc" },
    });
    return NextResponse.json({
      results: orgUnits.map((o) => ({
        type: "ORG_UNIT",
        id: o.id,
        label: o.name,
      })),
    });
  }

  if (type === "ORGANISATION") {
    return NextResponse.json({
      results: [{ type: "ORGANISATION", id: tenantId, label: "Organisation" }],
    });
  }

  if (type === "ROLE") {
    const normalized = q.toLowerCase();
    const results = PERSON_FUNCTION_OPTIONS.filter((option) => {
      if (!normalized) return true;
      return (
        option.label.toLowerCase().includes(normalized) ||
        option.value.toLowerCase().includes(normalized)
      );
    })
      .slice(0, take)
      .map((option) => ({
        type: "ROLE" as const,
        id: option.value,
        label: option.label,
        functionKey: option.value,
      }));
    return NextResponse.json({ results });
  }

  return NextResponse.json({ results: [] }, { status: 200 });
}
