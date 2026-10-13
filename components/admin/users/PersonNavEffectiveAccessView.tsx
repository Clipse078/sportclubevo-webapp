"use client";

import { useId } from "react";
import type { PersonNavEffectiveAccessSection } from "@/lib/admin/users/person-nav-effective-access";

type Props = {
  sections: PersonNavEffectiveAccessSection[];
  emptyMessage?: string;
  /** When true, sections start collapsed for progressive disclosure. */
  collapsible?: boolean;
};

export default function PersonNavEffectiveAccessView({
  sections,
  emptyMessage = "Keine freigegebenen Produktbereiche aus den zugewiesenen Rollen.",
  collapsible = false,
}: Props) {
  const listId = useId();

  if (sections.length === 0) {
    return <p className="text-sm text-[var(--muted)]">{emptyMessage}</p>;
  }

  const totalItems = sections.reduce((sum, section) => sum + section.items.length, 0);

  return (
    <div className="space-y-4" data-testid="person-effective-access">
      <p className="text-sm text-[var(--text-2)]">
        Effektiver Zugriff aus allen zugewiesenen Rollen ({sections.length} Bereich
        {sections.length === 1 ? "" : "e"}, {totalItems} Eintrag
        {totalItems === 1 ? "" : "e"}).
      </p>

      <ul className="space-y-3" aria-label="Effektiver Zugriff nach Produktbereich" id={listId}>
        {sections.map((section) => {
          const sectionKey = section.label;
          const itemCount = section.items.length;

          if (!collapsible) {
            return (
              <li
                key={sectionKey}
                className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface-2)]/80 px-4 py-3"
              >
                <p className="text-[0.68rem] font-semibold uppercase tracking-[0.12em] text-[var(--sce-primary,#d4843a)]">
                  {section.label}
                </p>
                <ul className="mt-2 space-y-2">
                  {section.items.map((item, index) => (
                    <li
                      key={`${item.label}-${index}`}
                      className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5 text-sm"
                    >
                      <span className="font-medium text-[var(--foreground)]">{item.label}</span>
                      <span className="text-[var(--text-2)]">· {item.access}</span>
                    </li>
                  ))}
                </ul>
              </li>
            );
          }

          return (
            <li key={sectionKey}>
              <details className="group rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface-2)]/80 open:pb-3">
                <summary className="cursor-pointer list-none px-4 py-3 marker:content-none [&::-webkit-details-marker]:hidden">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="text-[0.68rem] font-semibold uppercase tracking-[0.12em] text-[var(--sce-primary,#d4843a)]">
                      {section.label}
                    </span>
                    <span className="text-xs text-[var(--muted)]">
                      {itemCount} Modul{itemCount === 1 ? "" : "e"}
                    </span>
                  </div>
                </summary>
                <ul className="space-y-2 border-t border-[var(--border)] px-4 pt-3">
                  {section.items.map((item, index) => (
                    <li
                      key={`${item.label}-${index}`}
                      className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5 text-sm"
                    >
                      <span className="font-medium text-[var(--foreground)]">{item.label}</span>
                      <span className="text-[var(--text-2)]">· {item.access}</span>
                    </li>
                  ))}
                </ul>
              </details>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
