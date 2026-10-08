import { NextResponse } from "next/server";
import { isFacilityLifecycleError } from "@/lib/facilities/facility-lifecycle-errors";

export function facilityLifecycleErrorResponse(error: unknown): NextResponse | null {
  if (!isFacilityLifecycleError(error)) return null;

  const status =
    error.code === "DUPLICATE_RESOURCE"
      ? 409
      : error.code === "RESOURCE_IN_USE" || error.code === "FACILITY_IN_USE"
        ? 409
        : 400;

  return NextResponse.json({ error: error.message, code: error.code }, { status });
}
