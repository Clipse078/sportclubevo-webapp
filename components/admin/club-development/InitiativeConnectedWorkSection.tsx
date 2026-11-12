import Link from "next/link";
import { SectionCard } from "@/components/ui/page";
import type { InitiativeConnectedWork } from "@/lib/club-development/initiative-connected-work";
import { TASK_STATUS_LABELS } from "@/lib/tasks/management-labels";

type Props = {
  connected: InitiativeConnectedWork;
};

function formatDate(iso: string) {
  return new Intl.DateTimeFormat("de-CH", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(iso));
}

export default function InitiativeConnectedWorkSection({ connected }: Props) {
  const { agendaLinks, decisions, tasks } = connected;

  return (
    <div className="space-y-6">
      <SectionCard title="Sitzungen & Traktanden">
        {agendaLinks.length === 0 ? (
          <p className="text-sm text-[var(--text-2)]">
            Noch keine Traktanden mit diesem Vorhaben verknüpft.
          </p>
        ) : (
          <ul className="space-y-3">
            {agendaLinks.map((row) => (
              <li
                key={row.agendaItemId}
                className="rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="text-sm font-semibold text-[var(--foreground)]">{row.agendaTitle}</p>
                    <p className="text-xs text-[var(--text-2)]">
                      {row.agendaStatusLabel} ·{" "}
                      <Link href={row.meetingHref} className="text-[#0b4aa2] hover:underline">
                        {row.meetingTitle}
                      </Link>{" "}
                      · {formatDate(row.meetingDate)}
                    </p>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </SectionCard>

      <SectionCard title="Beschlüsse & Massnahmen">
        {decisions.length === 0 && tasks.length === 0 ? (
          <p className="text-sm text-[var(--text-2)]">
            Noch keine Beschlüsse oder Aufgaben im Zusammenhang mit diesem Vorhaben.
          </p>
        ) : (
          <div className="space-y-4">
            {decisions.length > 0 ? (
              <ul className="space-y-2">
                {decisions.map((d) => (
                  <li
                    key={d.decisionId}
                    className="rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2"
                  >
                    <p className="text-sm font-semibold text-[var(--foreground)]">{d.title}</p>
                    <p className="text-xs text-[var(--text-2)]">
                      <Link href={d.meetingHref} className="text-[#0b4aa2] hover:underline">
                        {d.meetingTitle}
                      </Link>
                      {d.agendaTitle ? ` · Traktandum: ${d.agendaTitle}` : null}
                    </p>
                  </li>
                ))}
              </ul>
            ) : null}
            {tasks.length > 0 ? (
              <div>
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">
                  Aufgaben
                </p>
                <ul className="space-y-2">
                  {tasks.map((t) => (
                    <li
                      key={t.id}
                      className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2"
                    >
                      <Link href={t.href} className="text-sm font-semibold text-[#0b4aa2] hover:underline">
                        {t.title}
                      </Link>
                      <span className="text-xs text-[var(--text-2)]">
                        {TASK_STATUS_LABELS[t.status as keyof typeof TASK_STATUS_LABELS] ?? t.status}
                        {t.assigneeLabel ? ` · ${t.assigneeLabel}` : ""}
                        {t.dueAt ? ` · ${formatDate(t.dueAt)}` : ""}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </div>
        )}
      </SectionCard>
    </div>
  );
}
