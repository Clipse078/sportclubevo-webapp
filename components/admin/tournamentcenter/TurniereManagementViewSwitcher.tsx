import Link from "next/link";
import { cn } from "@/lib/cn";
import type { TournamentListView } from "@/lib/tournaments/workspace-view-model";

type Props = {
  listView: TournamentListView;
  listeHref: string;
  kalenderHref: string;
  kompaktHref: string;
  kalenderDisabled?: boolean;
};

export default function TurniereManagementViewSwitcher({
  listView,
  listeHref,
  kalenderHref,
  kompaktHref,
  kalenderDisabled = true,
}: Props) {
  const items: {
    key: TournamentListView;
    label: string;
    href?: string;
    disabled?: boolean;
  }[] = [
    { key: "LISTE", label: "Liste", href: listeHref },
    { key: "KALENDER", label: "Kalender", href: kalenderHref, disabled: kalenderDisabled },
    { key: "KOMPAKT", label: "Kompakt", href: kompaktHref },
  ];

  return (
    <div
      className="inline-flex rounded-lg border border-[var(--border)] bg-[var(--surface-2)] p-0.5"
      role="group"
      aria-label="Ansicht"
      data-testid="turniere-view-switcher"
    >
      {items.map((item) => {
        const isActive = listView === item.key;
        if (item.disabled) {
          return (
            <span
              key={item.key}
              className="cursor-not-allowed rounded-md px-3 py-1.5 text-xs font-semibold text-[var(--muted)]/60"
              aria-disabled="true"
              data-testid={`turniere-view-${item.key.toLowerCase()}-disabled`}
            >
              {item.label}
            </span>
          );
        }

        return (
          <Link
            key={item.key}
            href={item.href!}
            aria-current={isActive ? "true" : undefined}
            data-testid={`turniere-view-${item.key.toLowerCase()}`}
            className={cn(
              "rounded-md px-3 py-1.5 text-xs font-semibold transition",
              isActive
                ? "bg-[var(--sce-primary)] text-white shadow-sm"
                : "text-[var(--text-2)] hover:text-[var(--foreground)]",
            )}
          >
            {item.label}
          </Link>
        );
      })}
    </div>
  );
}
