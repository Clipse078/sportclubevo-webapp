import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { validateCommunicationContextRef } from "@/lib/communication/platform/communication-context";
import type { CommunicationContextRef } from "@/lib/communication/platform/communication-context";
import { serializePersonalisationFieldsForClient } from "@/lib/communication/personalisation/field-availability";
import { prisma } from "@/lib/db/prisma";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const tenantId = session.user.activeTenantId;
  if (!tenantId) {
    return NextResponse.json({ error: "Tenant fehlt." }, { status: 400 });
  }

  const params = req.nextUrl.searchParams;
  const kind = params.get("contextKind") ?? "ORGANISATION";
  let contextRef: CommunicationContextRef;
  try {
    contextRef = parseContextRef(kind, params, tenantId);
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Ungültiger Kontext." },
      { status: 400 },
    );
  }

  const ctxErr = validateCommunicationContextRef(tenantId, contextRef);
  if (ctxErr) {
    return NextResponse.json({ error: ctxErr }, { status: 400 });
  }

  let eventType: string | null = null;
  if (contextRef.kind === "EVENT") {
    const event = await prisma.event.findFirst({
      where: { id: contextRef.eventId, tenantId },
      select: { type: true },
    });
    eventType = event?.type ?? null;
  }

  const fields = serializePersonalisationFieldsForClient({ contextRef, eventType });
  return NextResponse.json({ fields });
}

function parseContextRef(
  kind: string,
  params: URLSearchParams,
  tenantId: string,
): CommunicationContextRef {
  switch (kind) {
    case "ORGANISATION":
      return { kind: "ORGANISATION", tenantId };
    case "ORG_UNIT": {
      const orgUnitId = params.get("orgUnitId")?.trim();
      if (!orgUnitId) throw new Error("orgUnitId erforderlich.");
      return { kind: "ORG_UNIT", orgUnitId };
    }
    case "TEAM": {
      const teamId = params.get("teamId")?.trim();
      if (!teamId) throw new Error("teamId erforderlich.");
      return { kind: "TEAM", teamId };
    }
    case "EVENT": {
      const eventId = params.get("eventId")?.trim();
      if (!eventId) throw new Error("eventId erforderlich.");
      return { kind: "EVENT", eventId };
    }
    case "DIRECT":
      return { kind: "DIRECT", tenantId };
    default:
      throw new Error("contextKind unbekannt.");
  }
}
