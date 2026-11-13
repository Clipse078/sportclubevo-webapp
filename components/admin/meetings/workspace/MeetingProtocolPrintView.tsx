import type { ReactNode } from "react";
import type { MeetingProtocolDocumentModel } from "@/lib/meetings/meeting-protocol-document";
import MeetingProtocolBodyText from "@/components/admin/meetings/workspace/MeetingProtocolBodyText";

type Props = {
  model: MeetingProtocolDocumentModel;
};

function DecisionBlock({
  decision,
  accentColor,
}: {
  decision: MeetingProtocolDocumentModel["agendaItems"][number]["decisions"][number];
  accentColor: string;
}) {
  return (
    <li className="rounded border border-slate-200 p-3 text-slate-900">
      <p className="font-semibold text-slate-900">{decision.title}</p>
      {decision.statusLabel ? (
        <p className="mt-0.5 text-xs text-slate-600">Status: {decision.statusLabel}</p>
      ) : null}
      {decision.ownerLabel ? (
        <p className="text-xs text-slate-600">Verantwortlich: {decision.ownerLabel}</p>
      ) : null}
      {decision.description ? (
        <MeetingProtocolBodyText text={decision.description} className="mt-2 text-sm text-slate-700" />
      ) : null}
      {decision.rationale ? (
        <div className="mt-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Begründung</p>
          <MeetingProtocolBodyText text={decision.rationale} className="text-sm text-slate-700" />
        </div>
      ) : null}
      {decision.approvalRequired ? (
        <p className="mt-2 text-xs text-slate-600" style={{ borderLeftColor: accentColor, borderLeftWidth: 3, paddingLeft: 8 }}>
          Freigabe: {decision.approvalStatusLabel}
        </p>
      ) : null}
      {decision.approvalVotes.length > 0 ? (
        <ul className="mt-2 space-y-1 text-xs text-slate-600">
          {decision.approvalVotes.map((vote, index) => (
            <li key={index}>
              {vote.approverLabel}: {vote.decisionLabel}
              {vote.decidedAtLabel ? ` (${vote.decidedAtLabel})` : null}
              {vote.comment ? ` — ${vote.comment}` : null}
            </li>
          ))}
        </ul>
      ) : null}
    </li>
  );
}

function ActionBlock({
  action,
}: {
  action: MeetingProtocolDocumentModel["agendaItems"][number]["actions"][number];
}) {
  return (
    <li className="rounded border border-slate-200 p-3 text-slate-900">
      <p className="font-semibold">{action.title}</p>
      {action.statusLabel ? (
        <p className="mt-0.5 text-xs text-slate-600">Status: {action.statusLabel}</p>
      ) : null}
      {action.ownerLabel ? (
        <p className="text-xs text-slate-600">Verantwortlich: {action.ownerLabel}</p>
      ) : null}
      {action.dueDateLabel ? (
        <p className="text-xs text-slate-600">Fällig: {action.dueDateLabel}</p>
      ) : null}
      {action.description ? (
        <MeetingProtocolBodyText text={action.description} className="mt-2 text-sm text-slate-700" />
      ) : null}
      {action.expectedOutcome ? (
        <div className="mt-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Erwartetes Ergebnis / Ziel
          </p>
          <MeetingProtocolBodyText text={action.expectedOutcome} className="text-sm text-slate-700" />
        </div>
      ) : null}
    </li>
  );
}

export default function MeetingProtocolPrintView({ model }: Props) {
  const accent = model.tenantAccentColor || "#0b4aa2";

  return (
    <article
      className="sce-protocol-document mx-auto max-w-3xl bg-white p-8 text-slate-900 print:bg-white print:p-0 print:text-slate-900"
      data-testid="meeting-protocol-print"
    >
      <header className="border-b border-slate-200 pb-4">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{model.documentLabel}</p>
            <h1 className="mt-1 text-2xl font-semibold text-slate-900">{model.meetingTitle}</h1>
            {model.showHeaderApprovalState ? (
              <p className="mt-1 text-sm text-slate-600">{model.approvalStateLabel}</p>
            ) : null}
            <p className="mt-1 text-xs text-slate-500">Export: {model.exportGeneratedAtLabel}</p>
          </div>
          {model.tenantLogoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={model.tenantLogoUrl} alt="" className="h-12 w-auto object-contain" />
          ) : (
            <p className="text-sm font-semibold text-slate-700">{model.tenantName}</p>
          )}
        </div>
        {model.draftBanner ? (
          <p
            className="mt-4 rounded border border-amber-300 bg-amber-50 px-3 py-2 text-sm font-medium text-amber-950"
            data-testid="protocol-draft-banner"
          >
            {model.draftBanner}
          </p>
        ) : null}
      </header>

      <section className="mt-6">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Metadaten</h2>
        <dl className="mt-2 grid gap-1 text-sm sm:grid-cols-2">
          {model.metadataRows.map((row) => (
            <div key={row.label} className="grid grid-cols-[minmax(0,8rem)_1fr] gap-2">
              <dt className="text-slate-500">{row.label}</dt>
              <dd className="text-slate-900">{row.value}</dd>
            </div>
          ))}
        </dl>
      </section>

      {model.meetingDescription ? (
        <section className="mt-6">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Beschreibung</h2>
          <MeetingProtocolBodyText text={model.meetingDescription} className="mt-2 text-sm text-slate-700" />
        </section>
      ) : null}

      <section className="mt-6">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Teilnehmende</h2>
        {model.attendanceGroups.length > 0 ? (
          <div className="mt-3 space-y-4">
            {model.attendanceGroups.map((group) => (
              <div key={group.heading}>
                <h3 className="text-xs font-semibold text-slate-600">{group.heading}</h3>
                <ul className="mt-1 list-disc pl-5 text-sm text-slate-800">
                  {group.entries.map((entry, index) => (
                    <li key={`${group.heading}-${index}`}>
                      {entry.name}
                      {entry.role ? ` (${entry.role})` : ""}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        ) : (
          <ul className="mt-2 list-disc pl-5 text-sm text-slate-800">
            {model.attendanceRows.map((row, index) => (
              <li key={index}>
                {row.name}
                {row.roleLabel ? ` (${row.roleLabel})` : ""} — {row.attendanceLabel}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="mt-8">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Traktandenübersicht</h2>
        <ol className="mt-2 list-decimal pl-5 text-sm text-slate-900">
          {model.agendaOverview.map((item) => (
            <li key={item.orderNumber}>
              <span className="font-medium">{item.title}</span>
            </li>
          ))}
        </ol>
      </section>

      <section className="mt-8">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Traktanden im Detail</h2>
        <p className="mt-2 text-sm text-slate-800">
          Der Verlauf dieser Sitzung gliedert sich in die folgenden Traktanden. Entscheide und Massnahmen stehen im
          jeweiligen Traktandum.
        </p>
        <ol className="mt-4 space-y-6">
          {model.agendaItems.map((item) => (
            <li key={item.id} className="rounded border border-slate-200 p-4">
              <p className="text-base font-semibold text-slate-900">
                {item.orderNumber}. {item.title}
              </p>
              {item.presenterLabel ? (
                <p className="mt-1 text-xs text-slate-600">Referent/in: {item.presenterLabel}</p>
              ) : null}
              {item.durationLabel ? (
                <p className="text-xs text-slate-600">Dauer: {item.durationLabel}</p>
              ) : null}
              {item.initiativeTitle ? (
                <p className="text-xs text-slate-600">Vorhaben: {item.initiativeTitle}</p>
              ) : null}
              {item.backgroundText ? (
                <div className="mt-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Hintergrund</p>
                  <MeetingProtocolBodyText text={item.backgroundText} className="text-sm text-slate-700" />
                </div>
              ) : null}
              {item.protocolNotes ? (
                <div className="mt-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Protokoll</p>
                  <MeetingProtocolBodyText text={item.protocolNotes} className="text-sm text-slate-700" />
                </div>
              ) : null}
              {item.decisions.length > 0 ? (
                <ProtocolSubSection title="Beschlüsse" accent={accent}>
                  <ul className="mt-2 space-y-2">
                    {item.decisions.map((d) => (
                      <DecisionBlock key={d.id} decision={d} accentColor={accent} />
                    ))}
                  </ul>
                </ProtocolSubSection>
              ) : null}
              {item.actions.length > 0 ? (
                <div className="mt-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Massnahmen</p>
                  <ul className="mt-2 space-y-2">
                    {item.actions.map((a) => (
                      <ActionBlock key={a.id} action={a} />
                    ))}
                  </ul>
                </div>
              ) : null}
            </li>
          ))}
        </ol>
      </section>

      {model.unlinkedDecisions.length > 0 ? (
        <section className="mt-8">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
            Beschlüsse ohne Traktandum
          </h2>
          <ul className="mt-2 space-y-2">
            {model.unlinkedDecisions.map((d) => (
              <DecisionBlock key={d.id} decision={d} accentColor={accent} />
            ))}
          </ul>
        </section>
      ) : null}

      {model.unlinkedActions.length > 0 ? (
        <section className="mt-8">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
            Massnahmen ohne Traktandum
          </h2>
          <ul className="mt-2 space-y-2">
            {model.unlinkedActions.map((a) => (
              <ActionBlock key={a.id} action={a} />
            ))}
          </ul>
        </section>
      ) : null}

      {model.referencedPendenzen.length > 0 ? (
        <section className="mt-8">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Pendenzenübersicht</h2>
          <p className="mt-1 text-xs text-slate-600">{model.pendenzenOverviewFootnote}</p>
          <table className="mt-3 w-full border-collapse text-left text-sm text-slate-900">
            <thead>
              <tr className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-500">
                <th className="py-2 pr-2">Typ</th>
                <th className="py-2 pr-2">Titel</th>
                <th className="py-2 pr-2">Verantwortlich</th>
                <th className="py-2 pr-2">Fällig</th>
                <th className="py-2">Status</th>
              </tr>
            </thead>
            <tbody>
              {model.referencedPendenzen.map((row, index) => (
                <tr key={index} className="border-b border-slate-100">
                  <td className="py-2 pr-2 text-slate-600">{row.sourceTypeLabel}</td>
                  <td className="py-2 pr-2">
                    <span className="font-medium">{row.title}</span>
                    {row.compactSummary ? (
                      <p className="text-xs text-slate-600">{row.compactSummary}</p>
                    ) : null}
                  </td>
                  <td className="py-2 pr-2">{row.ownerLabel}</td>
                  <td className="py-2 pr-2">{row.dueDateLabel}</td>
                  <td className="py-2">{row.statusLabel}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      ) : null}

      {model.showLiveTaskStateNotice && model.meetingTasks.length > 0 ? (
        <section className="mt-8">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Aufgaben (Exportstand)</h2>
          <ul className="mt-2 list-disc pl-5 text-sm text-slate-800">
            {model.meetingTasks.map((task) => (
              <li key={task.id}>
                {task.title} — {task.statusLabel}
                {task.dueAtLabel ? ` (fällig ${task.dueAtLabel})` : ""}
                {task.contextReference ? ` · ${task.contextReference}` : ""}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {model.protocolApprovalVoteRows.length > 0 ? (
        <section className="mt-8">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Protokollfreigaben</h2>
          <ul className="mt-2 space-y-1 text-sm text-slate-800">
            {model.protocolApprovalVoteRows.map((vote, index) => (
              <li key={index}>
                {vote.approverLabel}: {vote.decisionLabel}
                {vote.decidedAtLabel ? ` (${vote.decidedAtLabel})` : null}
                {vote.comment ? ` — ${vote.comment}` : null}
              </li>
            ))}
          </ul>
          {model.protocolApprovalFootnote ? (
            <p className="mt-2 text-xs text-slate-600">{model.protocolApprovalFootnote}</p>
          ) : null}
        </section>
      ) : null}

      <footer className="mt-10 border-t border-slate-200 pt-4 text-xs text-slate-500">
        <p>{model.tenantFooterLine}</p>
        <p className="mt-1">{model.secondaryFooter}</p>
      </footer>
    </article>
  );
}

function ProtocolSubSection({
  title,
  accent,
  children,
}: {
  title: string;
  accent: string;
  children: ReactNode;
}) {
  return (
    <div className="mt-4" style={{ borderLeftColor: accent, borderLeftWidth: 2, paddingLeft: 12 }}>
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{title}</p>
      {children}
    </div>
  );
}
