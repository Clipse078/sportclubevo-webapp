import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { ProductDomainSceIcon } from "@/components/icons/ProductDomainSceIcon";
import type { SceIconRegistryName } from "@/components/design-system/icons/registry";
import { FutureCapabilityCard } from "@/components/admin/future-modules/FutureCapabilityCard";
import { SectionCard } from "@/components/ui/page";
import type { FutureModuleCapability } from "@/components/admin/future-modules/FutureModuleShell";

type FutureModulePageContentProps = {
  sceIcon?: SceIconRegistryName;
  icon?: LucideIcon;
  capabilities: FutureModuleCapability[];
  footerNote?: string;
  supplementaryContent?: ReactNode;
};

/**
 * Body content for future / in-preparation modules — no workspace chrome.
 * Pair with PageShell + ListPagePattern at the route layer (DS2-07F).
 */
export function FutureModulePageContent({
  sceIcon,
  icon: LegacyModuleIcon,
  capabilities,
  footerNote,
  supplementaryContent,
}: FutureModulePageContentProps) {
  return (
    <>
      <div className="mb-6 flex items-start gap-3 rounded-xl border border-[var(--border)] bg-[var(--surface-2)] px-4 py-3">
        <span className="mt-0.5 shrink-0 text-[var(--sce-primary)]" aria-hidden="true">
          {sceIcon ? (
            <ProductDomainSceIcon name={sceIcon} size={16} />
          ) : LegacyModuleIcon ? (
            <LegacyModuleIcon className="h-4 w-4" />
          ) : null}
        </span>
        <p className="text-xs leading-5 text-[var(--text-2)]">
          <span className="font-semibold text-[var(--foreground)]">Modul in Vorbereitung.</span>{" "}
          Die Bereiche zeigen die geplante Produktarchitektur. Es werden keine operativen Daten
          erfasst oder Workflows ausgeführt.
        </p>
      </div>

      <SectionCard title="Geplante Fähigkeiten" description="Produktarchitektur ohne operative Workflows.">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {capabilities.map((capability) => (
            <FutureCapabilityCard key={capability.title} {...capability} />
          ))}
        </div>
      </SectionCard>

      {supplementaryContent}

      {footerNote ? <p className="mt-6 text-xs text-[var(--muted)]">{footerNote}</p> : null}
    </>
  );
}
