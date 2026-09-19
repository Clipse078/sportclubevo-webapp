import Link from "next/link";
import { ListChecks } from "lucide-react";
import { DashboardSection } from "./DashboardSection";
import { DashboardEmptyState } from "./DashboardEmptyState";

export function MeineAufgabenWidget() {
  return (
    <DashboardSection
      title="Meine Aufgaben"
      icon={<ListChecks className="h-4 w-4" />}
      iconAccent="info"
      variant="card"
      bodyClassName="px-4 py-2.5 sm:px-5 sm:py-3"
      actions={
        <Link href="/dashboard/aufgaben" className="sce-link-primary text-[0.8125rem] font-medium">
          Alle Aufgaben →
        </Link>
      }
    >
      <DashboardEmptyState
        icon={<ListChecks className="h-5 w-5" />}
        title="Keine offenen Aufgaben"
        variant="compact"
      />
    </DashboardSection>
  );
}
