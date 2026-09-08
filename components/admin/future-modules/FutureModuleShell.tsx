import type { LucideIcon } from "lucide-react";
import { FutureCapabilityCard } from "@/components/admin/future-modules/FutureCapabilityCard";
import { Badge } from "@/components/ui/Badge";
import {
  PageBreadcrumbs,
  PageHeader,
  PageShell,
  SectionCard,
  type BreadcrumbItem,
} from "@/components/ui/page";

export type FutureModuleCapability = {
  title: string;
  description: string;
  icon: LucideIcon;
};

type FutureModuleShellProps = {
  title: string;
  purpose: string;
  icon: LucideIcon;
  capabilities: FutureModuleCapability[];
  breadcrumbs: BreadcrumbItem[];
  footerNote?: string;
  supplementaryContent?: React.ReactNode;
};

export function FutureModuleShell({
  title,
  purpose,
  icon: ModuleIcon,
  capabilities,
  breadcrumbs,
  footerNote,
  supplementaryContent,
}: FutureModuleShellProps) {
  return (
    <PageShell>
      <PageBreadcrumbs items={breadcrumbs} />

      <PageHeader
        eyebrow={title}
        title={title}
        description={purpose}
        badge={<Badge variant="warning">In Vorbereitung</Badge>}
      />

      <div className="mb-6 flex items-start gap-3 rounded-xl border border-[var(--border)] bg-[var(--surface-2)] px-4 py-3">
        <ModuleIcon
          className="mt-0.5 h-4 w-4 shrink-0 text-[var(--sce-primary)]"
          aria-hidden="true"
        />
        <p className="text-xs leading-5 text-[var(--text-2)]">
          <span className="font-semibold text-[var(--foreground)]">
            Modul in Vorbereitung.
          </span>{" "}
          Die Bereiche zeigen die geplante Produktarchitektur. Es werden keine operativen
          Daten erfasst oder Workflows ausgeführt.
        </p>
      </div>

      <div className="grid gap-5 sm:grid-cols-1 md:grid-cols-2 xl:grid-cols-3">
        {capabilities.map((capability) => (
          <FutureCapabilityCard
            key={capability.title}
            title={capability.title}
            description={capability.description}
            icon={capability.icon}
          />
        ))}
      </div>

      {supplementaryContent ? <div className="mt-8">{supplementaryContent}</div> : null}

      <SectionCard
        title="Strukturelle Vorbereitung in SCE"
        description={
          footerNote ??
          "Dieses Modul ist in der SCE-Plattformarchitektur vorbereitet. Operative Workflows werden schrittweise ergänzt, sobald die fachlichen Prozesse definiert sind."
        }
        className="mt-8"
      >
        <p className="text-sm leading-6 text-[var(--text-2)]">
          Die gezeigten Fähigkeiten beschreiben den geplanten Arbeitsumfang. Es gibt keine
          Datensätze, keine Aktionen und keine simulierten Ergebnisse.
        </p>
      </SectionCard>
    </PageShell>
  );
}
