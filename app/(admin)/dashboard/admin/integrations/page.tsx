/**
 * Admin → Integrationen overview page.
 *
 * Lists configured external integrations and their status at a glance.
 * Permission: TENANTS_MANAGE.
 */

import Link from "next/link";
import { requireAnyPermission } from "@/lib/permissions/require-any-permission";
import { PERMISSIONS } from "@/lib/permissions/permissions";
import { PageShell } from "@/components/ui/page";
import { SceFeatureCard } from "@/components/sce/workspace/SceFeatureCard";
import { SceWorkspaceChrome } from "@/components/sce/workspace/SceWorkspaceChrome";
import { getSfvConfigStatus } from "@/lib/integrations/sfv/config";

export const dynamic = "force-dynamic";

export default async function IntegrationsPage() {
  await requireAnyPermission([PERMISSIONS.TENANTS_MANAGE]);

  const sfvStatus = getSfvConfigStatus();

  return (
    <PageShell widthMode="operational">
      <SceWorkspaceChrome
        breadcrumbs={[{ label: "Admin", href: "/dashboard/admin" }, { label: "Integrationen" }]}
        header={{
          eyebrow: "Admin",
          title: "Integrationen",
          description: "Externe Datenquellen und Verbindungen verwalten.",
        }}
      >
      <SceFeatureCard
        title="SFV / ClubCorner"
        description="Schweizerischer Fussballverband — offizielle Spiel- und Turnierdaten"
      >
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-sm text-[var(--text-2)]">Status</span>
            {sfvStatus.allValid ? (
              <span className="inline-flex items-center rounded-full border border-[var(--sce-success-border)] bg-[var(--sce-success-light)] px-3 py-1 text-xs font-semibold uppercase tracking-wide text-[var(--sce-success)]">
                Konfiguriert
              </span>
            ) : sfvStatus.allPresent ? (
              <span className="inline-flex items-center rounded-full border border-[var(--sce-warning-border)] bg-[var(--sce-warning-light)] px-3 py-1 text-xs font-semibold uppercase tracking-wide text-[var(--sce-warning)]">
                Konfiguration ungültig
              </span>
            ) : (
              <span className="inline-flex items-center rounded-full border border-[var(--border)] bg-[var(--surface-2)] px-3 py-1 text-xs font-semibold uppercase tracking-wide text-[var(--text-2)]">
                Nicht konfiguriert
              </span>
            )}
          </div>

          <p className="text-xs text-[var(--text-2)] leading-relaxed">
            Slice 1: Authentifizierung und Verbindungstest. Keine SFV-Daten werden in dieser
            Version importiert oder geschrieben.
          </p>

          <div className="pt-1">
            <Link
              href="/dashboard/admin/integrations/sfv"
              className="inline-flex h-9 items-center rounded-lg border border-[var(--border-strong)] bg-[var(--surface)] px-3.5 text-sm font-semibold text-[var(--text-2)] transition-colors hover:bg-[var(--surface-2)] hover:text-[var(--foreground)]"
            >
              Details &rarr;
            </Link>
          </div>
        </div>
      </SceFeatureCard>
      </SceWorkspaceChrome>
    </PageShell>
  );
}
