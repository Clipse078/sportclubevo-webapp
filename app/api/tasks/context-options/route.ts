import { NextResponse } from "next/server";
import type { TaskContextType } from "@prisma/client";
import { PERMISSIONS } from "@/lib/permissions/permissions";
import { requireApiTenantPermissionContext } from "@/lib/permissions/require-api-tenant-context";
import { isSupportedTaskContextType } from "@/lib/tasks/context-registry";
import { searchTaskContextOptions } from "@/lib/tasks/context-selector-service";
import { getTaskServiceContext } from "@/lib/tasks/server-context";

export async function GET(request: Request) {
  const access = await requireApiTenantPermissionContext([
    PERMISSIONS.TASKS_CREATE,
    PERMISSIONS.TASKS_MANAGE,
  ]);
  if (!access.ok) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }

  const ctx = await getTaskServiceContext();
  if (!ctx) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(request.url);
  const contextTypeRaw = url.searchParams.get("contextType") ?? "";
  const q = url.searchParams.get("q") ?? "";

  if (!contextTypeRaw.trim()) {
    return NextResponse.json({ error: "contextType is required" }, { status: 400 });
  }

  if (!isSupportedTaskContextType(contextTypeRaw as TaskContextType)) {
    return NextResponse.json({ error: "Unsupported context type" }, { status: 400 });
  }

  const options = await searchTaskContextOptions(
    ctx,
    contextTypeRaw as TaskContextType,
    q,
  );

  return NextResponse.json({ options });
}
