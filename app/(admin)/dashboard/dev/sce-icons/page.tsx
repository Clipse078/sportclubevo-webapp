import { notFound } from "next/navigation";

import { isSceIconSpecimenAvailable } from "@/components/design-system/icons/sce-icon-specimen-gate";
import { SceIconSpecimen } from "@/components/design-system/icons/specimen/SceIconSpecimen";
import { PageShell } from "@/components/ui/page";
import { ListPagePattern } from "@/components/ui/patterns";

export default function SceIconsDevSpecimenPage() {
  if (!isSceIconSpecimenAvailable()) {
    notFound();
  }

  return (
    <PageShell fullWidth>
      <ListPagePattern
        eyebrow="Design System"
        title="SCE Icon Specimen"
        description="Entwickler-Specimen für Produkt-Domain-Icons und Registry-Abdeckung."
        breadcrumbs={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "SCE Icons" },
        ]}
      >
        <SceIconSpecimen />
      </ListPagePattern>
    </PageShell>
  );
}
