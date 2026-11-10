import { FutureModulePageContent } from "@/components/admin/future-modules/FutureModulePageContent";
import { Badge } from "@/components/ui/Badge";
import { PageShell, SectionCard } from "@/components/ui/page";
import { ListPagePattern } from "@/components/ui/patterns";
import {
  MITGLIEDER_CAPABILITIES,
  MITGLIEDER_LIFECYCLE_STEPS,
} from "@/lib/nav/future-modules";
import { requireAnyPermission } from "@/lib/permissions/require-any-permission";
import { TENANT_ADMINISTRATION_PERMISSIONS } from "@/lib/permissions/tenant-administration";

export const dynamic = "force-dynamic";

export default async function MitgliederPage() {
  await requireAnyPermission(TENANT_ADMINISTRATION_PERMISSIONS);

  return (
    <PageShell fullWidth>
      <ListPagePattern
        eyebrow="Mitglieder"
        title="Mitglieder"
        description="Den vollständigen Mitgliedschafts-Lebenszyklus verwalten — über reine Personenstammdaten hinaus."
        breadcrumbs={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Mitglieder" },
        ]}
        headerBadge={<Badge variant="warning">In Vorbereitung</Badge>}
      >
        <FutureModulePageContent
          sceIcon="member"
          capabilities={MITGLIEDER_CAPABILITIES}
          footerNote="Mitglieder ergänzt Personen um den Mitgliedschafts-Workflow. Personen bleibt die kanonische Stammdatenquelle; dieses Modul führt Interessenten, Anträge, Mitgliedschaften und Austritte strukturiert zusammen."
          supplementaryContent={
            <SectionCard
              title="Mitgliedschafts-Lebenszyklus"
              description="Personen erfasst Stammdaten. Mitglieder führt den Lebenszyklus von Interessent bis Austritt."
            >
              <ol
                className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7"
                aria-label="Geplanter Mitgliedschafts-Lebenszyklus"
              >
                {MITGLIEDER_LIFECYCLE_STEPS.map((step, index) => (
                  <li
                    key={step}
                    className="rounded-lg border border-[var(--border)] bg-[var(--surface-2)] px-3 py-3"
                  >
                    <span className="text-[0.65rem] font-semibold uppercase tracking-[0.1em] text-[var(--muted)]">
                      Schritt {index + 1}
                    </span>
                    <p className="mt-1 text-xs font-semibold text-[var(--foreground)]">{step}</p>
                  </li>
                ))}
              </ol>
            </SectionCard>
          }
        />
      </ListPagePattern>
    </PageShell>
  );
}
