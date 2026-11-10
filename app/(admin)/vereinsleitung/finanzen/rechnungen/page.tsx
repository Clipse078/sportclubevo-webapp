import { Badge } from "@/components/ui/Badge";
import { PageShell } from "@/components/ui/page";
import { ListPagePattern } from "@/components/ui/patterns";
import { FinanzenTabNav } from "@/components/finanzen/FinanzenTabNav";
import { RechnungenView } from "@/components/finanzen/RechnungenView";

export default function RechnungenPage() {
  return (
    <PageShell fullWidth>
      <ListPagePattern
        eyebrow="Finanzen"
        title="Fakturierung & Rechnungen"
        description="Rechnungen für Mitglieder, Sponsoren und Partner — interaktive Demo-Ansicht."
        breadcrumbs={[
          { label: "Vereinsleitung", href: "/vereinsleitung" },
          { label: "Finanzen", href: "/vereinsleitung/finanzen" },
          { label: "Rechnungen" },
        ]}
        headerBadge={<Badge variant="warning">In Entwicklung</Badge>}
        contextTabs={<FinanzenTabNav />}
      >
        <RechnungenView />
      </ListPagePattern>
    </PageShell>
  );
}
