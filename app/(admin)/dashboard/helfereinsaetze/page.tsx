import { FutureModulePageContent } from "@/components/admin/future-modules/FutureModulePageContent";
import { Badge } from "@/components/ui/Badge";
import { PageShell, SectionCard } from "@/components/ui/page";
import { ListPagePattern } from "@/components/ui/patterns";
import { HELFEREINSAETZE_CAPABILITIES } from "@/lib/nav/future-modules";
import { requireAnyPermission } from "@/lib/permissions/require-any-permission";
import { TENANT_ADMINISTRATION_PERMISSIONS } from "@/lib/permissions/tenant-administration";

export const dynamic = "force-dynamic";

const HELPER_ROLE_EXAMPLES = ["Grill", "Aufbau", "Kasse", "Fahrdienst"];

export default async function HelfereinsaetzePage() {
  await requireAnyPermission(TENANT_ADMINISTRATION_PERMISSIONS);

  return (
    <PageShell fullWidth>
      <ListPagePattern
        eyebrow="Helfereinsätze"
        title="Helfereinsätze"
        description="Freiwillige Einsätze für Turniere, Events und den Vereinsbetrieb koordinieren."
        breadcrumbs={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Helfereinsätze" },
        ]}
        headerBadge={<Badge variant="warning">In Vorbereitung</Badge>}
      >
        <FutureModulePageContent
          sceIcon="volunteer"
          capabilities={HELFEREINSAETZE_CAPABILITIES}
          supplementaryContent={
            <SectionCard
              title="Typische Einsatzrollen"
              description="Beispiele für verständliche Einsatzkategorien — ohne konkrete Schichten oder Vereinsdaten."
            >
              <ul className="flex flex-wrap gap-2" aria-label="Beispielhafte Einsatzrollen">
                {HELPER_ROLE_EXAMPLES.map((role) => (
                  <li
                    key={role}
                    className="rounded-lg border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2 text-xs font-medium text-[var(--text-2)]"
                  >
                    {role}
                  </li>
                ))}
              </ul>
            </SectionCard>
          }
        />
      </ListPagePattern>
    </PageShell>
  );
}
