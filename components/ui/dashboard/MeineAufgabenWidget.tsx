import Link from "next/link";
import { ListChecks } from "lucide-react";
import { DashboardSection } from "./DashboardSection";
import { DashboardEmptyState } from "./DashboardEmptyState";

export type PersonalTaskPreviewItem = {
  id: string;
  title: string;
  dueAt: string | null;
};

type Props = {
  available: boolean;
  previewItems: PersonalTaskPreviewItem[];
};

export function MeineAufgabenWidget({ available, previewItems }: Props) {
  const hasTasks = previewItems.length > 0;

  return (
    <DashboardSection
      title="Meine Aufgaben"
      icon={<ListChecks className="h-4 w-4" />}
      iconAccent="info"
      variant="card"
      bodyClassName="px-4 py-1.5 sm:px-5 sm:py-2"
      actions={
        available ? (
          <Link href="/dashboard/aufgaben" className="sce-link-primary text-[0.8125rem] font-medium">
            Alle Aufgaben →
          </Link>
        ) : undefined
      }
    >
      {!available ? (
        <DashboardEmptyState
          icon={<ListChecks className="h-4 w-4" />}
          title="Aufgaben nicht verfügbar"
          description="Für dein Konto ist das Aufgabenmodul noch nicht freigeschaltet."
          variant="compact"
          compactLayout="inline"
        />
      ) : hasTasks ? (
        <ul className="divide-y divide-[var(--border)]">
          {previewItems.map((task) => (
            <li key={task.id} className="py-2.5">
              <Link
                href="/dashboard/aufgaben"
                className="block text-[0.875rem] font-medium text-[var(--foreground)] hover:text-[var(--primary)]"
              >
                {task.title}
              </Link>
              {task.dueAt ? (
                <p className="mt-0.5 text-[0.75rem] text-[var(--muted-foreground)]">
                  Fällig: {new Date(task.dueAt).toLocaleDateString("de-CH")}
                </p>
              ) : null}
            </li>
          ))}
        </ul>
      ) : (
        <DashboardEmptyState
          icon={<ListChecks className="h-4 w-4" />}
          title="Keine offenen Aufgaben"
          variant="compact"
          compactLayout="inline"
        />
      )}
    </DashboardSection>
  );
}
