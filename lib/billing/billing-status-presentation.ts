export type BillingStatusTone = "success" | "warning" | "muted" | "default";

const SUBSCRIPTION_LABELS: Record<string, { label: string; tone: BillingStatusTone }> = {
  active: { label: "Aktiv", tone: "success" },
  trialing: { label: "Testphase", tone: "default" },
  past_due: { label: "Überfällig", tone: "warning" },
  canceled: { label: "Gekündigt", tone: "muted" },
  unpaid: { label: "Unbezahlt", tone: "warning" },
  paused: { label: "Pausiert", tone: "muted" },
  incomplete: { label: "Unvollständig", tone: "warning" },
  incomplete_expired: { label: "Abgelaufen", tone: "muted" },
};

const INVOICE_LABELS: Record<string, { label: string; tone: BillingStatusTone }> = {
  open: { label: "Offen", tone: "warning" },
  paid: { label: "Bezahlt", tone: "success" },
  void: { label: "Storniert", tone: "muted" },
  uncollectible: { label: "Uneinbringlich", tone: "muted" },
  draft: { label: "Entwurf", tone: "muted" },
};

export function presentSubscriptionStatus(status: string | null | undefined): {
  label: string;
  tone: BillingStatusTone;
} {
  if (!status) {
    return { label: "Unbekannt", tone: "muted" };
  }
  const normalized = status.toLowerCase();
  return (
    SUBSCRIPTION_LABELS[normalized] ?? {
      label: status,
      tone: "muted",
    }
  );
}

export function presentInvoiceStatus(status: string | null | undefined): {
  label: string;
  tone: BillingStatusTone;
} {
  if (!status) {
    return { label: "Unbekannt", tone: "muted" };
  }
  const normalized = status.toLowerCase();
  return (
    INVOICE_LABELS[normalized] ?? {
      label: status,
      tone: "muted",
    }
  );
}

export function pickPrimarySubscription(
  subscriptions: { status: string; planName: string | null }[],
): { status: string; planName: string | null } | null {
  if (subscriptions.length === 0) {
    return null;
  }
  const ranked = [...subscriptions].sort((a, b) => {
    const score = (s: string) => {
      if (s === "active") return 0;
      if (s === "trialing") return 1;
      if (s === "past_due") return 2;
      return 3;
    };
    return score(a.status) - score(b.status);
  });
  return ranked[0] ?? null;
}
