import Link from "next/link";
import type { SpieleListView } from "@/lib/matchcenter/navigation";
import { cn } from "@/lib/cn";

type Props = {
  listView: SpieleListView;
  listeHref: string;
  kompaktHref: string;
  kalenderHref: string;
};

export default function SpieleManagementViewSwitcher({
  listView,
  listeHref,
  kompaktHref,
  kalenderHref,
}: Props) {
  const items: { key: SpieleListView; label: string; href: string }[] = [
    { key: "LISTE", label: "Liste", href: listeHref },
    { key: "KALENDER", label: "Kalender", href: kalenderHref },
    { key: "KOMPAKT", label: "Kompakt", href: kompaktHref },
  ];

  return (
    <div
      className="inline-flex rounded-lg border border-[var(--border)] bg-[var(--surface-2)] p-0.5"
      role="group"
      aria-label="Ansicht"
      data-testid="spiele-view-switcher"
    >
      {items.map((item) => {
        const active = item.key === listView;
        return (
          <Link
            key={item.key}
            href={item.href}
            data-testid={`spiele-view-${item.key.toLowerCase()}`}
            aria-current={active ? "true" : undefined}
            className={cn(
              "rounded-md px-3 py-1.5 text-xs font-semibold transition-colors duration-150",
              active
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
