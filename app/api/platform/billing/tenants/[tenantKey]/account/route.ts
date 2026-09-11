/**
 * GET|PUT|DELETE /api/platform/billing/tenants/[tenantKey]/account
 *
 * Platform-scoped tenant ↔ Stripe customer linkage (no Stripe API calls).
 *
 * GET  — billing.view — returns { account } or { account: null }
 * PUT  — billing.manage — body { stripeCustomerId } — link or change
 * DELETE — billing.manage — remove linkage
 *
 * tenantKey is the SCE tenant key (e.g. fc-allschwil), never inferred from names.
 */

import { NextRequest, NextResponse } from "next/server";
import { requireApiAnyPermission } from "@/lib/permissions/require-api-any-permission";
import { requireApiPermission } from "@/lib/permissions/require-api-permission";
import { PERMISSIONS } from "@/lib/permissions/permissions";
import {
  BillingCustomerAlreadyLinkedError,
  BillingTenantNotFoundError,
  BillingValidationError,
  getTenantBillingAccount,
  linkTenantStripeCustomer,
  resolveTenantIdFromKey,
  unlinkTenantStripeCustomer,
} from "@/lib/billing/tenant-billing-account-service";

type RouteContext = { params: Promise<{ tenantKey: string }> };

function serializeAccount(account: {
  id: string;
  tenantId: string;
  stripeCustomerId: string;
  linkedAt: Date;
  linkedByUserId: string | null;
  createdAt: Date;
  updatedAt: Date;
}) {
  return {
    id: account.id,
    tenantId: account.tenantId,
    stripeCustomerId: account.stripeCustomerId,
    linkedAt: account.linkedAt.toISOString(),
    linkedByUserId: account.linkedByUserId,
    createdAt: account.createdAt.toISOString(),
    updatedAt: account.updatedAt.toISOString(),
  };
}

async function resolveTenantId(tenantKey: string): Promise<string | null> {
  const normalized = tenantKey.trim();
  if (!normalized) return null;
  return resolveTenantIdFromKey(normalized);
}

export async function GET(_request: NextRequest, context: RouteContext) {
  const access = await requireApiAnyPermission([PERMISSIONS.BILLING_VIEW]);
  if (!access.ok) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }

  const { tenantKey } = await context.params;
  const tenantId = await resolveTenantId(tenantKey);
  if (!tenantId) {
    return NextResponse.json({ error: "Tenant nicht gefunden." }, { status: 404 });
  }

  const account = await getTenantBillingAccount(tenantId);
  return NextResponse.json({
    account: account ? serializeAccount(account) : null,
  });
}

export async function PUT(request: NextRequest, context: RouteContext) {
  const access = await requireApiPermission(PERMISSIONS.BILLING_MANAGE);
  if (!access.ok) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }

  const actorUserId = access.session.user?.effectiveUserId ?? access.session.user?.id;
  if (!actorUserId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { tenantKey } = await context.params;
  const tenantId = await resolveTenantId(tenantKey);
  if (!tenantId) {
    return NextResponse.json({ error: "Tenant nicht gefunden." }, { status: 404 });
  }

  const body = await request.json().catch(() => ({}));
  const stripeCustomerId =
    typeof body?.stripeCustomerId === "string" ? body.stripeCustomerId : "";

  try {
    const account = await linkTenantStripeCustomer({
      tenantId,
      stripeCustomerId,
      actorUserId,
    });
    return NextResponse.json({ account: serializeAccount(account) });
  } catch (err) {
    if (err instanceof BillingValidationError) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }
    if (err instanceof BillingCustomerAlreadyLinkedError) {
      return NextResponse.json({ error: err.message }, { status: 409 });
    }
    if (err instanceof BillingTenantNotFoundError) {
      return NextResponse.json({ error: err.message }, { status: 404 });
    }
    console.error("Platform billing link failed:", err);
    return NextResponse.json({ error: "Verknüpfung fehlgeschlagen." }, { status: 500 });
  }
}

export async function DELETE(_request: NextRequest, context: RouteContext) {
  const access = await requireApiPermission(PERMISSIONS.BILLING_MANAGE);
  if (!access.ok) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }

  const actorUserId = access.session.user?.effectiveUserId ?? access.session.user?.id;
  if (!actorUserId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { tenantKey } = await context.params;
  const tenantId = await resolveTenantId(tenantKey);
  if (!tenantId) {
    return NextResponse.json({ error: "Tenant nicht gefunden." }, { status: 404 });
  }

  try {
    await unlinkTenantStripeCustomer({ tenantId, actorUserId });
    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof BillingTenantNotFoundError) {
      return NextResponse.json({ error: err.message }, { status: 404 });
    }
    console.error("Platform billing unlink failed:", err);
    return NextResponse.json({ error: "Verknüpfung konnte nicht entfernt werden." }, { status: 500 });
  }
}
