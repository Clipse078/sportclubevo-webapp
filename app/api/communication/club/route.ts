import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { getActiveTenant } from "@/lib/tenants/active-tenant";
import { listClubCommunications, createClubCommunicationDraft } from "@/lib/communication/club/club-communication-service";
import {
  requireClubCommunicationSend,
  requireClubCommunicationView,
} from "@/lib/communication/club/club-communication-authorization";
import { TeamCommunicationForbiddenError } from "@/lib/communication/team/team-communication-errors";
import type { CommunicationAudienceSpec } from "@/lib/communication/platform/audience/zielgruppe-definition";

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const tenant = await getActiveTenant();
  if (!tenant) {
    return NextResponse.json({ error: "Tenant not found" }, { status: 404 });
  }

  try {
    const authz = await requireClubCommunicationView({
      tenantId: tenant.id,
      tenantKey: tenant.key,
      userId: session.user.id,
    });
    const url = new URL(request.url);
    const items = await listClubCommunications({
      tenantId: tenant.id,
      viewerUserId: session.user.id,
      viewerCanSend: authz.canSend,
      limit: Number(url.searchParams.get("limit") ?? "50"),
      status: url.searchParams.get("status") ?? undefined,
      kind: url.searchParams.get("kind") ?? undefined,
      search: url.searchParams.get("q") ?? undefined,
    });
    return NextResponse.json({ items });
  } catch (error) {
    if (error instanceof TeamCommunicationForbiddenError) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    throw error;
  }
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const tenant = await getActiveTenant();
  if (!tenant) {
    return NextResponse.json({ error: "Tenant not found" }, { status: 404 });
  }

  try {
    await requireClubCommunicationSend({
      tenantId: tenant.id,
      tenantKey: tenant.key,
      userId: session.user.id,
    });
  } catch (error) {
    if (error instanceof TeamCommunicationForbiddenError) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    throw error;
  }

  const body = (await request.json()) as {
    kind?: string;
    subject?: string | null;
    bodyText?: string;
    audienceSpec?: CommunicationAudienceSpec;
    acknowledgementRequired?: boolean;
  };

  const result = await createClubCommunicationDraft({
    tenantId: tenant.id,
    senderUserId: session.user.id,
    kind: body.kind,
    subject: body.subject,
    bodyText: body.bodyText ?? "",
    audienceSpec: body.audienceSpec ?? {
      composition: "UNION",
      components: [{ structural: { wholeOrganisation: true } }],
    },
    acknowledgementRequired: body.acknowledgementRequired,
  });

  return NextResponse.json(result, { status: 201 });
}
