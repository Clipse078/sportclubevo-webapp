import Link from "next/link";
import { ArrowRight } from "lucide-react";
import type { AdminHubGroupViewModel } from "@/lib/nav/admin-hub-catalog";

type AdminHubViewProps = {
  groups: AdminHubGroupViewModel[];
};

function AdminHubCard({
  title,
  description,
  href,
}: {
  title: string;
  description: string;
  href: string;
}) {
  const linkLabel = `${title} öffnen`;
  return (
    <Link
      href={href}
      aria-label={linkLabel}
      className="group flex h-full flex-col rounded-[var(--radius-lg)] border border-[var(--sce-surface-border)] bg-[var(--sce-surface-standard)] p-4 no-underline md:p-5 motion-safe:transition-[background-color,border-color,box-shadow,transform] motion-safe:duration-150 motion-safe:hover:-translate-y-px motion-safe:hover:border-[var(--border-strong)] motion-safe:hover:bg-[var(--surface-2)] motion-safe:hover:shadow-[var(--shadow-sm)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--sce-primary)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--background)]"
    >
      <h3 className="text-base font-semibold text-[var(--foreground)]">{title}</h3>
      <p className="mt-1.5 flex-1 text-sm leading-relaxed text-[var(--text-2)]">{description}</p>
      <span className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-[var(--sce-primary)]">
        {linkLabel}
        <ArrowRight className="h-4 w-4 motion-safe:transition-transform motion-safe:group-hover:translate-x-0.5" aria-hidden />
      </span>
    </Link>
  );
}

export function AdminHubView({ groups }: AdminHubViewProps) {
  if (groups.length === 0) {
    return (
      <p className="text-sm text-[var(--text-2)]">
        Für Ihr Konto sind derzeit keine Admin-Module freigeschaltet.
      </p>
    );
  }

  return (
    <div className="space-y-8">
      {groups.map((group) => (
        <section key={group.id} aria-labelledby={`admin-hub-group-${group.id}`} className="space-y-3">
          <h2
            id={`admin-hub-group-${group.id}`}
            className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--muted)]"
          >
            {group.title}
          </h2>
          <div className="grid gap-3 md:grid-cols-2">
            {group.cards.map((card) => (
              <AdminHubCard
                key={card.key}
                title={card.title}
                description={card.description}
                href={card.href}
              />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
