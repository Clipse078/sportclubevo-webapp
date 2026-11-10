import VereinsleitungKpisPage from "@/components/admin/vereinsleitung/VereinsleitungKpisPage";
import { PageShell } from "@/components/ui/page";
import { ListPagePattern } from "@/components/ui/patterns";

export default function VereinsleitungKpisRoutePage() {
  return (
    <PageShell fullWidth>
      <ListPagePattern
        eyebrow="Vereinsleitung"
        title="KPIs"
        description="Aggregierte Kennzahlen für Mitglieder, Teams, Personal und strategische Entwicklung."
        breadcrumbs={[
          { label: "Vereinsleitung", href: "/vereinsleitung" },
          { label: "KPIs" },
        ]}
      >
        <VereinsleitungKpisPage />
      </ListPagePattern>
    </PageShell>
  );
}
