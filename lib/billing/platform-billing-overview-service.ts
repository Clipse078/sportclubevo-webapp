import { findAllLinkedTenantBillingAccounts } from "@/lib/billing/tenant-billing-account-repository";
import {
  aggregatePlatformBillingKpis,
  type PlatformBillingKpis,
} from "@/lib/billing/billing-kpi";
import { getTenantBillingSummary } from "@/lib/integrations/stripe/billing-read-service";
import type { TenantBillingSummary } from "@/lib/integrations/stripe/billing-types";
import { getStripeConfigStatus } from "@/lib/integrations/stripe/config";
import {
  StripeConfigurationError,
  StripeIntegrationError,
  toSafePublicStripeError,
} from "@/lib/integrations/stripe/errors";

const DEFAULT_CONCURRENCY = 4;

export type PlatformBillingStripeState =
  | { kind: "ready" }
  | { kind: "not_configured"; message: string }
  | { kind: "misconfigured"; message: string };

export type PlatformBillingTenantRow =
  | {
      kind: "loaded";
      tenantId: string;
      tenantKey: string;
      tenantName: string;
      summary: TenantBillingSummary;
    }
  | {
      kind: "error";
      tenantId: string;
      tenantKey: string;
      tenantName: string;
      errorCode: string;
      message: string;
    };

export type PlatformBillingOverview = {
  stripeState: PlatformBillingStripeState;
  rows: PlatformBillingTenantRow[];
  kpis: PlatformBillingKpis;
  linkedTenantCount: number;
};

function resolveStripeState(): PlatformBillingStripeState {
  const status = getStripeConfigStatus();
  if (!status.allValid) {
    if (!status.hasSecretKey || !status.providerEnabled) {
      return {
        kind: "not_configured",
        message:
          "Stripe ist in dieser Umgebung nicht konfiguriert. Billing-Daten können nicht geladen werden.",
      };
    }
    return {
      kind: "misconfigured",
      message:
        "Die Stripe-Konfiguration ist für diese Umgebung ungültig. Bitte den Secret Key prüfen.",
    };
  }
  return { kind: "ready" };
}

async function runWithConcurrency<T, R>(
  items: T[],
  concurrency: number,
  worker: (item: T) => Promise<R>,
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let nextIndex = 0;

  async function runWorker() {
    while (nextIndex < items.length) {
      const index = nextIndex;
      nextIndex += 1;
      results[index] = await worker(items[index]!);
    }
  }

  await Promise.all(
    Array.from({ length: Math.min(concurrency, items.length) }, () => runWorker()),
  );

  return results;
}

export async function getPlatformBillingOverview(): Promise<PlatformBillingOverview> {
  const stripeState = resolveStripeState();
  const links = await findAllLinkedTenantBillingAccounts();

  if (links.length === 0) {
    return {
      stripeState,
      rows: [],
      kpis: {
        mrrByCurrency: {},
        activeCustomerCount: 0,
        outstandingByCurrency: {},
        overdueInvoiceCount: 0,
      },
      linkedTenantCount: 0,
    };
  }

  if (stripeState.kind !== "ready") {
    return {
      stripeState,
      rows: links.map((link) => ({
        kind: "error",
        tenantId: link.tenantId,
        tenantKey: link.tenantKey,
        tenantName: link.tenantName,
        errorCode:
          stripeState.kind === "not_configured"
            ? "STRIPE_NOT_CONFIGURED"
            : "STRIPE_CONFIGURATION_INVALID",
        message: stripeState.message,
      })),
      kpis: {
        mrrByCurrency: {},
        activeCustomerCount: 0,
        outstandingByCurrency: {},
        overdueInvoiceCount: 0,
      },
      linkedTenantCount: links.length,
    };
  }

  const rows = await runWithConcurrency(links, DEFAULT_CONCURRENCY, async (link) => {
    try {
      const summary = await getTenantBillingSummary(link.tenantId);
      return {
        kind: "loaded" as const,
        tenantId: link.tenantId,
        tenantKey: link.tenantKey,
        tenantName: link.tenantName,
        summary,
      };
    } catch (error) {
      if (error instanceof StripeConfigurationError) {
        return {
          kind: "error" as const,
          tenantId: link.tenantId,
          tenantKey: link.tenantKey,
          tenantName: link.tenantName,
          errorCode: error.code,
          message:
            "Stripe ist nicht verfügbar. Billing-Daten für diesen Tenant konnten nicht geladen werden.",
        };
      }
      if (error instanceof StripeIntegrationError) {
        return {
          kind: "error" as const,
          tenantId: link.tenantId,
          tenantKey: link.tenantKey,
          tenantName: link.tenantName,
          errorCode: error.code,
          message:
            error.code === "NO_BILLING_ACCOUNT"
              ? "Keine gültige Billing-Verknüpfung für diesen Tenant."
              : "Billing-Daten konnten nicht geladen werden.",
        };
      }
      const safe = toSafePublicStripeError(error);
      return {
        kind: "error" as const,
        tenantId: link.tenantId,
        tenantKey: link.tenantKey,
        tenantName: link.tenantName,
        errorCode: safe.code,
        message: "Billing-Daten konnten nicht geladen werden.",
      };
    }
  });

  const loadedSummaries = rows
    .filter((row): row is Extract<PlatformBillingTenantRow, { kind: "loaded" }> =>
      row.kind === "loaded",
    )
    .map((row) => row.summary);

  return {
    stripeState,
    rows,
    kpis: aggregatePlatformBillingKpis(loadedSummaries),
    linkedTenantCount: links.length,
  };
}
