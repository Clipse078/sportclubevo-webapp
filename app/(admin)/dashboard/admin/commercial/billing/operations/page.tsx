import { redirect } from "next/navigation";
import AdminSectionHeader from "@/components/admin/shared/AdminSectionHeader";
import { getBillingOperationsDiagnostics } from "@/lib/billing/operations/billing-operations-diagnostics";
import { prisma } from "@/lib/db/prisma";
import { PERMISSIONS } from "@/lib/permissions/permissions";
import { requirePermission } from "@/lib/permissions/require-permission";
import { isPlatformSuperAdmin } from "@/lib/security/platform-superadmin";

export const dynamic = "force-dynamic";

function State({
  ok,
  children,
}: {
  ok: boolean;
  children: React.ReactNode;
}) {
  return (
    <span
      className={
        ok
          ? "font-medium text-emerald-700"
          : "font-medium text-amber-700"
      }
    >
      {children}
    </span>
  );
}

export default async function BillingOperationsPage() {
  const session = await requirePermission(PERMISSIONS.BILLING_MANAGE);
  const actorId = session.user.actorUserId ?? session.user.id;
  if (!actorId || !(await isPlatformSuperAdmin(prisma, actorId))) {
    redirect("/dashboard");
  }

  const diagnostics = await getBillingOperationsDiagnostics();
  const row = (label: string, value: React.ReactNode) => (
    <div className="flex items-start justify-between gap-6 border-b border-border/60 py-3 last:border-0">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="max-w-[65%] break-words text-right font-mono text-xs">
        {value}
      </dd>
    </div>
  );

  return (
    <div className="max-w-4xl space-y-8">
      <AdminSectionHeader
        eyebrow="Commercial · Billing"
        title="Operations & Diagnostics"
        description="Sichere Laufzeit-, Daten- und Providerdiagnose. Es werden keine Geheimnisse oder vollständigen Kontodaten angezeigt."
      />

      <div
        className={
          diagnostics.readiness.result === "READY"
            ? "rounded-lg border border-emerald-200 bg-emerald-50 p-5"
            : "rounded-lg border border-amber-200 bg-amber-50 p-5"
        }
      >
        <p className="text-sm font-semibold">
          Production readiness: {diagnostics.readiness.result}
        </p>
        {diagnostics.readiness.missing.length ? (
          <p className="mt-1 text-sm">
            {diagnostics.readiness.missing.join(" · ")}
          </p>
        ) : null}
      </div>

      <section className="rounded-lg border border-border bg-card px-5">
        <h2 className="pt-5 text-sm font-semibold">Deployment</h2>
        <dl>
          {row("Environment", diagnostics.runtime.deploymentEnvironment)}
          {row("Vercel environment", diagnostics.runtime.vercelEnvironment ?? "—")}
          {row("Commit", diagnostics.runtime.commitSha ?? "—")}
          {row("Deployment ID", diagnostics.runtime.deploymentId ?? "—")}
        </dl>
      </section>

      <section className="rounded-lg border border-border bg-card px-5">
        <h2 className="pt-5 text-sm font-semibold">Billing data</h2>
        <dl>
          {row("Data environment", diagnostics.runtime.dataEnvironment)}
          {row("Database fingerprint", diagnostics.runtime.databaseFingerprint ?? "—")}
          {row("Migration status", diagnostics.migrationStatus)}
          {row(
            "Billing encryption key",
            diagnostics.billingEncryptionKeyConfigured ? "configured" : "missing",
          )}
        </dl>
      </section>

      <section className="rounded-lg border border-border bg-card px-5">
        <h2 className="pt-5 text-sm font-semibold">Legal entity</h2>
        <dl>
          {row(
            "Active legal entity",
            diagnostics.legalEntity
              ? `${diagnostics.legalEntity.displayName} (${diagnostics.legalEntity.key})`
              : "—",
          )}
          {row("Bank account", diagnostics.legalEntity?.bankAccountConfigured ? "configured" : "missing")}
          {row("QR-IBAN", diagnostics.legalEntity?.qrIbanConfigured ? "configured" : "missing")}
          {row("Reference type", diagnostics.legalEntity?.referenceType ?? "—")}
        </dl>
      </section>

      <section className="rounded-lg border border-border bg-card px-5">
        <h2 className="pt-5 text-sm font-semibold">Providers</h2>
        <dl>
          {row(
            "Swiss QR",
            <State ok={diagnostics.providers.swissQr === "OPERATIONAL"}>
              {diagnostics.providers.swissQr}
            </State>,
          )}
          {row(
            "camt.054 reconciliation",
            <State ok={diagnostics.providers.camt054 === "OPERATIONAL"}>
              {diagnostics.providers.camt054}
            </State>,
          )}
          {row(
            "Stripe",
            <State ok={diagnostics.providers.stripe === "CONNECTED"}>
              {diagnostics.providers.stripe}
            </State>,
          )}
        </dl>
      </section>
    </div>
  );
}
