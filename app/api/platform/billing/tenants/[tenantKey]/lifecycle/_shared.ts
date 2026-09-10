import { NextResponse } from "next/server";
import { requireApiPermission } from "@/lib/permissions/require-api-permission";
import { PERMISSIONS } from "@/lib/permissions/permissions";
import { resolveTenantIdFromKey } from "@/lib/billing/tenant-billing-account-service";
import type { LifecycleCommandFailure } from "@/lib/tenants/tenant-lifecycle-types";

export async function requireBillingManageActor() {
  const access = await requireApiPermission(PERMISSIONS.BILLING_MANAGE);
  if (!access.ok) {
    return { ok: false as const, response: NextResponse.json({ error: access.error }, { status: access.status }) };
  }

  const actorUserId =
    access.session.user?.effectiveUserId ?? access.session.user?.id;
  if (!actorUserId) {
    return {
      ok: false as const,
      response: NextResponse.json({ error: "Forbidden" }, { status: 403 }),
    };
  }

  return { ok: true as const, actorUserId };
}

export async function resolveTenantIdFromRouteKey(tenantKey: string): Promise<string | null> {
  const normalized = tenantKey.trim();
  if (!normalized) {
    return null;
  }
  return resolveTenantIdFromKey(normalized);
}

export function lifecycleFailureResponse(failure: LifecycleCommandFailure) {
  const status =
    failure.code === "TENANT_NOT_FOUND"
      ? 404
      : failure.code === "INVALID_TRANSITION"
        ? 409
        : failure.code === "STRIPE_FAILED"
          ? 502
          : failure.reconciliationRequired
            ? 500
            : 400;

  return NextResponse.json(
    {
      error: failure.message,
      code: failure.code,
      reconciliationRequired: failure.reconciliationRequired ?? false,
    },
    { status },
  );
}
