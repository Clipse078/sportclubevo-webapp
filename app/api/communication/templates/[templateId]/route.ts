import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { getActiveTenant } from "@/lib/tenants/active-tenant";
import {
  archivePlatformCommunicationTemplate,
  getPlatformCommunicationTemplate,
  updatePlatformCommunicationTemplate,
} from "@/lib/communication/templates/platform-template-service";
import {
  requirePlatformTemplateManage,
  requirePlatformTemplateView,
} from "@/lib/communication/templates/platform-template-authorization";
import {
  TeamCommunicationForbiddenError,
  TeamCommunicationNotFoundError,
  TeamCommunicationValidationError,
} from "@/lib/communication/team/team-communication-errors";

type RouteContext = { params: Promise<{ templateId: string }> };

export async function GET(_request: Request, context: RouteContext) {
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
    const template = await getPlatformCommunicationTemplate({
      tenantId: tenant.id,
      templateId,
    });
    return NextResponse.json({ template });
  } catch (error) {
    if (error instanceof TeamCommunicationForbiddenError) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    if (error instanceof TeamCommunicationNotFoundError) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    throw error;
  }
}

export async function PATCH(request: Request, context: RouteContext) {
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

  const body = await request.json();
  try {
    const updated = await updatePlatformCommunicationTemplate({
      tenantId: tenant.id,
      templateId,
      actorUserId: session.user.id,
      ...body,
    });
    return NextResponse.json(updated);
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

export async function DELETE(_request: Request, context: RouteContext) {
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
    await archivePlatformCommunicationTemplate({
      tenantId: tenant.id,
      templateId,
      actorUserId: session.user.id,
    });
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof TeamCommunicationForbiddenError) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    if (error instanceof TeamCommunicationNotFoundError) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    throw error;
  }
}
