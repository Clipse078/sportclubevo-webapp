import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { getActiveTenant } from "@/lib/tenants/active-tenant";
import { createDraftFromPlatformTemplate } from "@/lib/communication/templates/platform-template-service";
import { requirePlatformTemplateView } from "@/lib/communication/templates/platform-template-authorization";
import { requireClubCommunicationSend } from "@/lib/communication/club/club-communication-authorization";
import {
  TeamCommunicationForbiddenError,
  TeamCommunicationNotFoundError,
  TeamCommunicationValidationError,
} from "@/lib/communication/team/team-communication-errors";

type RouteContext = { params: Promise<{ templateId: string }> };

export async function POST(_request: Request, context: RouteContext) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const tenant = await getActiveTenant();
  if (!tenant) {
    return NextResponse.json({ error: "Tenant not found" }, { status: 404 });
  }
  const { templateId } = await context.params;

  try {
    await requirePlatformTemplateView({
      tenantId: tenant.id,
      tenantKey: tenant.key,
      userId: session.user.id,
    });
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

  try {
    const draft = await createDraftFromPlatformTemplate({
      tenantId: tenant.id,
      templateId,
      actorUserId: session.user.id,
    });
    return NextResponse.json(draft, { status: 201 });
  } catch (error) {
    if (error instanceof TeamCommunicationValidationError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    if (error instanceof TeamCommunicationNotFoundError) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    throw error;
  }
}
