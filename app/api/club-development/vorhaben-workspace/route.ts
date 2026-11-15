import { NextRequest, NextResponse } from "next/server";
import { InitiativeStatus, TaskStatus } from "@prisma/client";
import { loadVorhabenWorkspace } from "@/lib/club-development/vorhaben-workspace";
import { PERMISSIONS } from "@/lib/permissions/permissions";
import { requireStrategicApiContext } from "@/lib/permissions/require-strategic-api-context";

function parseInitiativeStatus(raw: string | null): InitiativeStatus | undefined {
  if (!raw) return undefined;
  return Object.values(InitiativeStatus).includes(raw as InitiativeStatus)
    ? (raw as InitiativeStatus)
    : undefined;
}

function parseTaskStatus(raw: string | null): TaskStatus | undefined {
  if (!raw) return undefined;
  return Object.values(TaskStatus).includes(raw as TaskStatus) ? (raw as TaskStatus) : undefined;
}

export async function GET(req: NextRequest) {
  const access = await requireStrategicApiContext([
    PERMISSIONS.INITIATIVES_VIEW,
    PERMISSIONS.INITIATIVES_MANAGE,
    PERMISSIONS.TASKS_VIEW,
    PERMISSIONS.TASKS_MANAGE,
  ]);
  if (!access.ok) return access.response;

  const params = req.nextUrl.searchParams;
  const filters = {
    search: params.get("search") ?? undefined,
    initiativeId: params.get("initiativeId")?.trim() || undefined,
    targetId: params.get("targetId")?.trim() || undefined,
    initiativeStatus: parseInitiativeStatus(params.get("initiativeStatus")),
    taskStatus: parseTaskStatus(params.get("taskStatus")),
  };

  try {
    const snapshot = await loadVorhabenWorkspace(access.context.actor, filters);
    return NextResponse.json(snapshot);
  } catch (error) {
    console.error("Vorhaben workspace load failed:", error);
    return NextResponse.json(
      { error: "Vorhaben & Aufgaben konnten nicht geladen werden." },
      { status: 500 },
    );
  }
}