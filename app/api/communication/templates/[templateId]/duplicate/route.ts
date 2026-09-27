import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { getActiveTenant } from "@/lib/tenants/active-tenant";
import { duplicatePlatformCommunicationTemplate } from "@/lib/communication/templates/platform-template-service";
import { requirePlatformTemplateManage } from "@/lib/communication/templates/platform-template-authorization";
import {
  TeamCommunicationForbiddenError,
  TeamCommunicationNotFoundError,
  TeamCommunicationValidationError,
} from "@/lib/communication/team/team-communication-errors";

type RouteContext = { params: Promise<{ templateId: string }> };

export async function POST(request: Request, context: RouteContext) {
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
    await requirePlatformTemplateManage({
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

  const body = await request.json().catch(() => ({}));
  try {
    const created = await duplicatePlatformCommunicationTemplate({
      tenantId: tenant.id,
      templateId,
      actorUserId: session.user.id,
      name: body.name,
    });
    return NextResponse.json(created, { status: 201 });
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
