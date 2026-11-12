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

export default function MeetingProtocolPrintView({ meeting, subEntities }: Props) {
  return (
    <article
      className="mx-auto max-w-3xl bg-white p-8 text-[var(--foreground)] print:p-0"
      data-testid="meeting-protocol-print"
    >
      <header className="border-b border-slate-200 pb-4">
        <h1 className="text-2xl font-semibold">{meeting.title}</h1>
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
        <ul className="mt-2 list-disc pl-5 text-sm">
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
        <ol className="mt-2 list-decimal pl-5 text-sm">
          {subEntities.agendaItems.map((a) => (
            <li key={a.id} className="mb-2">
              <span className="font-medium">{a.title}</span>
              {a.notes ? <p className="text-slate-600">{a.notes}</p> : null}
            </li>
          ))}
        </ol>
      </section>

      <section className="mt-6">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Beschlüsse</h2>
        <ul className="mt-2 space-y-2 text-sm">
          {subEntities.decisions.map((d) => (
            <li key={d.id}>
              <span className="font-medium">{d.title}</span>
              {d.description ? <p className="text-slate-600">{d.description}</p> : null}
              {d.approvalRequired ? (
                <p className="text-xs text-slate-500">Freigabe: {d.approvalStatus}</p>
              ) : null}
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-6">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Massnahmen</h2>
        <ul className="mt-2 list-disc pl-5 text-sm">
          {subEntities.actions.map((a) => (
            <li key={a.id}>
              {a.title}
              {a.owner ? ` — ${a.owner}` : ""}
            </li>
          ))}
        </ul>
      </section>
    </article>
  );
}
