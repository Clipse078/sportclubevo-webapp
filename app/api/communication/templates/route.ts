import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { getActiveTenant } from "@/lib/tenants/active-tenant";
import {
  createPlatformCommunicationTemplate,
  listPlatformCommunicationTemplates,
} from "@/lib/communication/templates/platform-template-service";
import {
  requirePlatformTemplateManage,
  requirePlatformTemplateView,
} from "@/lib/communication/templates/platform-template-authorization";
import {
  TeamCommunicationForbiddenError,
  TeamCommunicationValidationError,
} from "@/lib/communication/team/team-communication-errors";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const tenant = await getActiveTenant();
  if (!tenant) {
    return NextResponse.json({ error: "Tenant not found" }, { status: 404 });
  }

  try {
    await requirePlatformTemplateView({
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

  const templates = await listPlatformCommunicationTemplates({ tenantId: tenant.id });
  return NextResponse.json({ templates });
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

  const body = await request.json();
  try {
    const created = await createPlatformCommunicationTemplate({
      tenantId: tenant.id,
      actorUserId: session.user.id,
      name: body.name,
      description: body.description,
      kind: body.kind,
      internalName: body.internalName,
      subject: body.subject,
      bodyText: body.bodyText,
      audienceSpec: body.audienceSpec,
      orchestration: body.orchestration,
      status: body.status,
    });
    return NextResponse.json(created, { status: 201 });
  } catch (error) {
    if (error instanceof TeamCommunicationValidationError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    throw error;
  }
}
