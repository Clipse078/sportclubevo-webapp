import { NextResponse } from "next/server";
import { getRequirementServiceContext } from "@/lib/requirements/server-context";
import { unlinkRequirementFromPlanningResource } from "@/lib/planning/requirement-planning-resource-service";
import { RequirementForbiddenError, RequirementValidationError } from "@/lib/requirements/errors";

type RouteContext = { params: Promise<{ referenceId: string }> };

export async function DELETE(_request: Request, context: RouteContext) {
  const ctx = await getRequirementServiceContext();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { referenceId } = await context.params;

  try {
    await unlinkRequirementFromPlanningResource(ctx, referenceId);
    return NextResponse.json({ ok: true });
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
