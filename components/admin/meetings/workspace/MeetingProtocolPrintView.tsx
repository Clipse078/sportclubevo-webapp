import type { MeetingLiveData, MeetingSubEntities } from "@/lib/meetings/queries";

function formatDate(date: Date) {
  return new Intl.DateTimeFormat("de-CH", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(date));
}

type Props = {
  meeting: MeetingLiveData;
  subEntities: MeetingSubEntities;
};

/**
 * Printable meeting protocol — isolated light document surface (print + screen).
 * Uses fixed slate neutrals so admin dark theme tokens cannot wash out body text.
 */
export default function MeetingProtocolPrintView({ meeting, subEntities }: Props) {
  return (
    <article
      className="sce-protocol-document mx-auto max-w-3xl bg-white p-8 text-slate-900 print:bg-white print:p-0 print:text-slate-900"
      data-testid="meeting-protocol-print"
    >
      <header className="border-b border-slate-200 pb-4">
        <h1 className="text-2xl font-semibold text-slate-900">{meeting.title}</h1>
        <p className="mt-1 text-sm text-slate-600">
          {formatDate(meeting.meetingDate)}
          {meeting.location ? ` · ${meeting.location}` : null}
        </p>
        {meeting.status === "COMPLETED" && meeting.closedAt ? (
          <p className="mt-1 text-xs text-slate-500">
            Abgeschlossen am {formatDate(meeting.closedAt)}
          </p>
        ) : null}
      </header>

      <section className="mt-6">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Teilnehmer</h2>
        <ul className="mt-2 list-disc pl-5 text-sm text-slate-800">
          {subEntities.participants.map((p) => (
            <li key={p.id}>
              {p.name}
              {p.role ? ` (${p.role})` : ""} — {p.status}
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-6">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Traktanden</h2>
        <ol className="mt-2 list-decimal pl-5 text-sm text-slate-800">
          {subEntities.agendaItems.map((a) => (
            <li key={a.id} className="mb-2">
              <span className="font-medium text-slate-900">{a.title}</span>
              {a.notes ? <p className="text-slate-600">{a.notes}</p> : null}
            </li>
          ))}
        </ol>
      </section>

      <section className="mt-6">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Beschlüsse</h2>
        <ul className="mt-2 space-y-2 text-sm text-slate-800">
          {subEntities.decisions.map((d) => (
            <li key={d.id}>
              <span className="font-medium text-slate-900">{d.title}</span>
              {d.description ? <p className="text-slate-600">{d.description}</p> : null}
              {d.rationale ? (
                <p className="text-xs text-slate-500">
                  <span className="font-medium text-slate-600">Begründung:</span> {d.rationale}
                </p>
              ) : null}
              {d.approvalRequired ? (
                <p className="text-xs text-slate-500">Freigabe: {d.approvalStatus}</p>
              ) : null}
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-6">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Massnahmen</h2>
        <ul className="mt-2 list-disc pl-5 text-sm text-slate-800">
          {subEntities.actions.map((a) => (
            <li key={a.id} className="mb-2">
              <span className="font-medium text-slate-900">{a.title}</span>
              {a.owner ? ` — ${a.owner}` : ""}
              {a.description ? <p className="text-slate-600">{a.description}</p> : null}
              {a.expectedOutcome ? (
                <p className="text-xs text-slate-500">
                  <span className="font-medium text-slate-600">Ziel:</span> {a.expectedOutcome}
                </p>
              ) : null}
            </li>
          ))}
        </ul>
      </section>
    </article>
  );
}
