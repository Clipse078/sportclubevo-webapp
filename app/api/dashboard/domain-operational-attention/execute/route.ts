import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { getActiveTenant } from "@/lib/tenants/active-tenant";
import {
  DomainOperationalAttentionActionNotFoundError,
  DomainOperationalAttentionItemNotFoundError,
  executeDomainOperationalAttentionAction,
} from "@/lib/domain-attention/execute-operational-attention-action";

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const tenant = await getActiveTenant();
  if (!tenant) {
    return NextResponse.json({ error: "Tenant not found" }, { status: 404 });
  }

  const body = (await request.json()) as {
    attentionId?: string;
    actionKey?: string;
    bodyText?: string | null;
  };

  const attentionId = body.attentionId?.trim();
  const actionKey = body.actionKey?.trim();
  if (!attentionId || !actionKey) {
    return NextResponse.json({ error: "attentionId and actionKey are required" }, { status: 400 });
  }

  try {
    const result = await executeDomainOperationalAttentionAction({
      tenantId: tenant.id,
      userId: session.user.id,
      attentionId,
      actionKey,
      bodyText: body.bodyText,
    });
    return NextResponse.json(result);
  } catch (error) {
    if (
      error instanceof DomainOperationalAttentionItemNotFoundError ||
      error instanceof DomainOperationalAttentionActionNotFoundError
    ) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    throw error;
  }
}
