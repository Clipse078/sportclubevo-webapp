import { NextResponse } from "next/server";
import type { PlanningResourceType } from "@prisma/client";
import { getRequirementServiceContext } from "@/lib/requirements/server-context";
import { linkRequirementToPlanningResource } from "@/lib/planning/requirement-planning-resource-service";
import { RequirementForbiddenError, RequirementValidationError } from "@/lib/requirements/errors";

function parseResourceType(value: unknown): PlanningResourceType | null {
  if (
    value === "TRAINING" ||
    value === "MATCH" ||
    value === "TOURNAMENT" ||
    value === "CLUB_EVENT"
  ) {
    return value;
  }
  return null;
}

export async function POST(request: Request) {
  const ctx = await getRequirementServiceContext();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  const resourceType = parseResourceType(body?.resourceType);
  const resourceId = typeof body?.resourceId === "string" ? body.resourceId : "";
  const requirementId = typeof body?.requirementId === "string" ? body.requirementId : "";

  if (!resourceType || !resourceId || !requirementId) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  try {
    await linkRequirementToPlanningResource(ctx, requirementId, { resourceType, resourceId });
    return NextResponse.json({ ok: true }, { status: 201 });
  } catch (err) {
    if (err instanceof RequirementForbiddenError) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    if (err instanceof RequirementValidationError) {
      return NextResponse.json({ error: err.message }, { status: 404 });
    }
    throw err;
  }
}
