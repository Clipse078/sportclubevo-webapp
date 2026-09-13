import { redirect } from "next/navigation";
import BillingPageHeader from "@/components/admin/billing/shell/BillingPageHeader";
import BillingWorkspaceContent from "@/components/admin/billing/shell/BillingWorkspaceContent";
import BillingPanel from "@/components/admin/billing/shell/BillingPanel";
import BillingStatusBadge from "@/components/admin/billing/BillingStatusBadge";
import { getBillingOperationsDiagnostics } from "@/lib/billing/operations/billing-operations-diagnostics";
import { prisma } from "@/lib/db/prisma";
import { PERMISSIONS } from "@/lib/permissions/permissions";
import { requirePermission } from "@/lib/permissions/require-permission";
import { isPlatformSuperAdmin } from "@/lib/security/platform-superadmin";

export const dynamic = "force-dynamic";

function DiagnosticRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-6 border-b border-[color-mix(in_srgb,var(--border)_40%,transparent)] py-3 last:border-0 text-sm">
      <dt className="text-[var(--text-2)]">{label}</dt>
      <dd className="max-w-[65%] break-words text-right text-[var(--foreground)]">{children}</dd>
    </div>
  );
}

export default async function BillingOperationsPage() {
  const session = await requirePermission(PERMISSIONS.BILLING_MANAGE);
  const actorId = session.user.actorUserId ?? session.user.id;
  if (!actorId || !(await isPlatformSuperAdmin(prisma, actorId))) {
    redirect("/dashboard");
  }

  const diagnostics = await getBillingOperationsDiagnostics();

  return (
    <BillingWorkspaceContent width="wide">
      <div className="space-y-6">
        <BillingPageHeader
          title="Operations"
          description="Erweiterte Diagnose für Deployment, Billing-Daten und Provider — ohne Geheimnisse oder vollständige Kontodaten."
        />

        <BillingPanel
          title={`Bereitschaft: ${diagnostics.readiness.result}`}
          description={
            diagnostics.readiness.missing.length
              ? diagnostics.readiness.missing.join(" · ")
              : "Alle geprüften Voraussetzungen erfüllt."
          }
        >
          <BillingStatusBadge
            label={diagnostics.readiness.result === "READY" ? "Bereit" : "Prüfen"}
            tone={diagnostics.readiness.result === "READY" ? "success" : "warning"}
          />
        </BillingPanel>

        <div className="grid gap-6 lg:grid-cols-2">
          <BillingPanel title="Deployment">
            <dl>
              <DiagnosticRow label="Datenumgebung">
                <BillingStatusBadge
                  label={diagnostics.runtime.dataEnvironment}
                  tone={diagnostics.runtime.dataEnvironment === "STAGE" ? "default" : "warning"}
                />
              </DiagnosticRow>
              <DiagnosticRow label="Deployment">
                <BillingStatusBadge label={diagnostics.runtime.deploymentEnvironment} tone="muted" />
              </DiagnosticRow>
              <DiagnosticRow label="Commit">
                <span className="font-mono text-xs text-[var(--muted)]">
                  {diagnostics.runtime.commitSha ?? "—"}
                </span>
              </DiagnosticRow>
            </dl>
          </BillingPanel>

          <BillingPanel title="Billing-Daten">
            <dl>
              <DiagnosticRow label="Migrationen">
                {diagnostics.migrationStatus === "CURRENT" ? "Aktuell" : diagnostics.migrationStatus}
              </DiagnosticRow>
              <DiagnosticRow label="Verschlüsselung">
                {diagnostics.billingEncryptionKeyConfigured ? "Konfiguriert" : "Fehlt"}
              </DiagnosticRow>
              <DiagnosticRow label="Datenbank-Fingerprint">
                <span className="font-mono text-xs text-[var(--muted)]">
                  {diagnostics.runtime.databaseFingerprint ?? "—"}
                </span>
              </DiagnosticRow>
            </dl>
          </BillingPanel>

          <BillingPanel title="Rechtsträger">
            <dl>
              <DiagnosticRow label="Aktiver Rechtsträger">
                {diagnostics.legalEntity?.displayName ?? "—"}
              </DiagnosticRow>
              <DiagnosticRow label="Bankkonto">
                {diagnostics.legalEntity?.bankAccountConfigured ? "Konfiguriert" : "Fehlt"}
              </DiagnosticRow>
              <DiagnosticRow label="QR-IBAN">
                {diagnostics.legalEntity?.qrIbanConfigured ? "Konfiguriert" : "Fehlt"}
              </DiagnosticRow>
            </dl>
          </BillingPanel>
        </div>

        <BillingPanel title="Provider-Status">
          <dl className="grid gap-0 sm:grid-cols-3">
            <DiagnosticRow label="Swiss QR">
              <BillingStatusBadge
                label={
                  diagnostics.providers.swissQr === "OPERATIONAL"
                    ? "Betriebsbereit"
                    : diagnostics.providers.swissQr
                }
                tone={diagnostics.providers.swissQr === "OPERATIONAL" ? "success" : "warning"}
              />
            </DiagnosticRow>
            <DiagnosticRow label="camt.054">
              <BillingStatusBadge
                label={
                  diagnostics.providers.camt054 === "OPERATIONAL"
                    ? "Betriebsbereit"
                    : diagnostics.providers.camt054
                }
                tone={diagnostics.providers.camt054 === "OPERATIONAL" ? "success" : "warning"}
              />
            </DiagnosticRow>
            <DiagnosticRow label="Stripe">
              <BillingStatusBadge
                label={
                  diagnostics.providers.stripe === "CONNECTED" ? "Verbunden" : "Nicht verbunden"
                }
                tone={diagnostics.providers.stripe === "CONNECTED" ? "success" : "muted"}
              />
            </DiagnosticRow>
          </dl>
        </BillingPanel>
      </div>
    </BillingWorkspaceContent>
  );
}
