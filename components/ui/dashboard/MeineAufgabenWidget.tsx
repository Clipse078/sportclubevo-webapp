import Link from "next/link";
import { ProductDomainSceIcon } from "@/components/icons/ProductDomainSceIcon";
import { ListChecks } from "lucide-react";
import { DashboardSection } from "./DashboardSection";
import { DashboardEmptyState } from "./DashboardEmptyState";

export type PersonalTaskPreviewItem = {
  id: string;
  title: string;
  subtitle?: string | null;
  metaLine?: string | null;
  href?: string | null;
  sourceLabel?: string;
};

type Props = {
  previewItems: PersonalTaskPreviewItem[];
};

export function MeineAufgabenWidget({ previewItems }: Props) {
  const hasItems = previewItems.length > 0;

  return (
    <DashboardSection
      title="Meine Aufgaben"
      icon={<ProductDomainSceIcon name="tasks" size={16} />}
      iconAccent="info"
      variant="card"
      bodyClassName="px-4 py-1.5 sm:px-5 sm:py-2"
      actions={
        <Link href="/dashboard/aufgaben?bereich=meine" className="sce-link-primary text-[0.8125rem] font-medium">
          Alle anzeigen →
        </Link>
      }
    >
      {hasItems ? (
        <ul className="divide-y divide-[var(--border)]">
          {previewItems.map((item) => {
            const content = (
              <>
                <span className="block text-[0.875rem] font-medium text-[var(--foreground)]">
                  {item.title}
                </span>
                {item.subtitle ? (
                  <p className="text-[0.75rem] text-[var(--muted-foreground)]">{item.subtitle}</p>
                ) : null}
                {item.metaLine ? (
                  <p className="mt-0.5 text-[0.75rem] text-[var(--muted-foreground)]">{item.metaLine}</p>
                ) : null}
              </>
            );

            return (
              <li key={item.id} className="py-2.5">
                {item.href ? (
                  <Link
                    href={item.href}
                    className="block hover:text-[var(--primary)]"
                  >
                    {content}
                  </Link>
                ) : (
                  <div className="block">{content}</div>
                )}
              </li>
            );
          })}
        </ul>
      ) : (
        <DashboardEmptyState
          icon={<ProductDomainSceIcon name="tasks" size={16} />}
          title="Alles erledigt"
          description="Aktuell gibt es keine offenen Aufgaben oder Rückmeldungen."
          variant="compact"
          compactLayout="stacked"
        />
      )}
    </DashboardSection>
  );
}
