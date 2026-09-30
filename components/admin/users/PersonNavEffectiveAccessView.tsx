"use client";

import type { PersonNavEffectiveAccessSection } from "@/lib/admin/users/person-nav-effective-access";

type Props = {
  sections: PersonNavEffectiveAccessSection[];
  emptyMessage?: string;
};

export default function PersonNavEffectiveAccessView({
  sections,
  emptyMessage = "Keine freigegebenen Produktbereiche aus den zugewiesenen Rollen.",
}: Props) {
  if (sections.length === 0) {
    return <p className="text-sm text-[var(--muted)]">{emptyMessage}</p>;
  }

  return (
    <ul className="space-y-4" aria-label="Effektiver Zugriff nach Produktbereich">
      {sections.map((section) => (
        <li
          key={section.label}
          className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface-2)]/80 px-4 py-3"
        >
          <p className="text-[0.68rem] font-semibold uppercase tracking-[0.12em] text-[var(--sce-primary,#d4843a)]">
            {section.label}
          </p>
          <ul className="mt-2 space-y-2">
            {section.items.map((item, index) => (
              <li key={`${item.label}-${index}`} className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5 text-sm">
                <span className="font-medium text-[var(--foreground)]">{item.label}</span>
                <span className="text-[var(--text-2)]">· {item.access}</span>
              </li>
            ))}
          </ul>
        </li>
      ))}
    </ul>
  );
}
