import type { ReactNode } from "react";
import type {
  MeetingProtocolDocumentAction,
  MeetingProtocolDocumentDecision,
  MeetingProtocolDocumentModel,
} from "@/lib/meetings/meeting-protocol-document";
import { PROTOCOL_NOT_RECORDED } from "@/lib/meetings/meeting-protocol-labels";
import MeetingProtocolBodyText from "@/components/admin/meetings/workspace/MeetingProtocolBodyText";

type Props = {
  model: MeetingProtocolDocumentModel;
};

function SectionHeading({ children }: { children: ReactNode }) {
  return (
    <h2 className="mt-8 border-b border-slate-200 pb-1 text-sm font-semibold uppercase tracking-wide text-slate-600 print:break-after-avoid">
      {children}
    </h2>
  );
}

function SubHeading({ children }: { children: ReactNode }) {
  return <h3 className="mt-4 text-base font-semibold text-slate-900 print:break-after-avoid">{children}</h3>;
}

function FieldBlock({
  label,
  children,
  empty,
}: {
  label: string;
  children?: ReactNode;
  empty?: boolean;
}) {
  if (empty) return null;
  return (
    <div className="mt-3 print:break-inside-avoid">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</p>
      <div className="mt-1 text-sm leading-relaxed text-slate-800">{children}</div>
    </div>
  );
}

function DecisionBlock({ decision }: { decision: MeetingProtocolDocumentDecision }) {
  return (
    <div
      className="mt-4 rounded-md border border-slate-200 bg-slate-50/80 p-4 print:break-inside-avoid"
      data-testid={`protocol-decision-${decision.id}`}
    >
      <p className="font-semibold text-slate-900">{decision.title}</p>
      {decision.description ? (
        <FieldBlock label="Beschlusswortlaut">
          <MeetingProtocolBodyText text={decision.description} />
        </FieldBlock>
      ) : null}
      {decision.rationale ? (
        <FieldBlock label="Begründung">
          <MeetingProtocolBodyText text={decision.rationale} />
        </FieldBlock>
      ) : null}
      <p className="mt-2 text-xs text-slate-600">
        Status: {decision.statusLabel}
        {decision.ownerLabel ? ` · Verantwortlich: ${decision.ownerLabel}` : ""}
      </p>
      {decision.approvalRequired ? (
        <div className="mt-2 text-xs text-slate-600">
          <p>
            Freigabe: <span className="font-medium">{decision.approvalStatusLabel}</span>
          </p>
          {decision.approvalVotes.length > 0 ? (
            <ul className="mt-1 list-disc pl-4">
              {decision.approvalVotes.map((vote, index) => (
                <li key={index}>
                  {vote.approverLabel}: {vote.decisionLabel}
                  {vote.decidedAtLabel ? ` (${vote.decidedAtLabel})` : ""}
                  {vote.comment ? ` — ${vote.comment}` : ""}
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

function ActionBlock({ action }: { action: MeetingProtocolDocumentAction }) {
  return (
    <div
      className="mt-3 border-l-2 border-slate-300 pl-3 print:break-inside-avoid"
      data-testid={`protocol-action-${action.id}`}
    >
      <p className="font-medium text-slate-900">{action.title}</p>
      {action.description ? (
        <FieldBlock label="Beschreibung">
          <MeetingProtocolBodyText text={action.description} />
        </FieldBlock>
      ) : null}
      {action.expectedOutcome ? (
        <FieldBlock label="Erwartetes Ergebnis / Ziel">
          <MeetingProtocolBodyText text={action.expectedOutcome} />
        </FieldBlock>
      ) : null}
      <p className="mt-1 text-xs text-slate-600">
        Verantwortlich: {action.ownerLabel ?? PROTOCOL_NOT_RECORDED} · Termin:{" "}
        {action.dueDateLabel ?? PROTOCOL_NOT_RECORDED} · Status: {action.statusLabel}
      </p>
    </div>
  );
}

function StatePill({ label }: { label: string }) {
  return (
    <p
      className="max-w-[12rem] shrink-0 rounded-md border border-slate-300 bg-white px-2 py-1 text-right text-[10px] font-semibold uppercase leading-snug text-slate-700"
      data-testid="protocol-approval-state"
    >
      {label}
    </p>
  );
}

function ProtocolClosingSections({ model }: { model: MeetingProtocolDocumentModel }) {
  const hasVotes = model.protocolApprovalVoteRows.length > 0;
  const hasFootnote = Boolean(model.protocolApprovalFootnote);

  return (
    <>
      {hasVotes ? (
        <section data-testid="protocol-approval-votes">
          <SectionHeading>Protokollfreigabe — Stimmverhalten</SectionHeading>
          <ul className="mt-2 list-disc pl-5 text-sm text-slate-800">
            {model.protocolApprovalVoteRows.map((vote, index) => (
              <li key={index}>
                {vote.approverLabel}: {vote.decisionLabel}
                {vote.decidedAtLabel ? ` (${vote.decidedAtLabel})` : ""}
                {vote.comment ? ` — ${vote.comment}` : ""}
              </li>
            ))}
          </ul>
        </section>
      ) : null}
      {hasFootnote ? (
        <p className="mt-4 text-xs text-slate-500" data-testid="protocol-approval-footnote">
          {model.protocolApprovalFootnote}
        </p>
      ) : null}
      <footer className="mt-10 border-t border-slate-200 pt-4 text-xs text-slate-500 print:break-inside-avoid">
        <p>Exportiert am {model.exportGeneratedAtLabel}</p>
        <p className="mt-1 opacity-80">{model.secondaryFooter}</p>
      </footer>
    </>
  );
}

export default function MeetingProtocolPrintView({ model }: Props) {
  const accentStyle = { color: model.tenantAccentColor, borderColor: model.tenantAccentColor };

  return (
    <article
      className="sce-protocol-document mx-auto max-w-[210mm] bg-white px-6 py-8 text-[11pt] leading-relaxed text-slate-900 print:bg-white print:px-[15mm] print:py-[12mm] print:text-[10.5pt] print:text-slate-900"
      data-testid="meeting-protocol-print"
    >
      <header className="border-b-2 pb-5 print:break-inside-avoid" style={{ borderColor: model.tenantAccentColor }}>
        <div className="flex items-start justify-between gap-6">
          <div className="flex min-w-0 items-start gap-4">
            {model.tenantLogoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={model.tenantLogoUrl}
                alt=""
                className="h-24 w-auto max-w-[140px] object-contain object-left print:h-[28mm]"
              />
            ) : (
              <div
                className="flex h-24 w-24 shrink-0 items-center justify-center rounded-md border border-slate-200 bg-slate-50 text-center text-xs font-semibold uppercase text-slate-600 print:h-[28mm] print:w-[28mm]"
                aria-hidden
              >
                {model.tenantName.slice(0, 12)}
              </div>
            )}
            <div className="min-w-0">
              <p className="text-lg font-semibold text-slate-900">{model.tenantName}</p>
              <p className="mt-1 text-sm font-semibold uppercase tracking-wide" style={accentStyle}>
                {model.documentLabel}
              </p>
            </div>
          </div>
          <StatePill label={model.approvalStateLabel} />
        </div>

        <h1 className="mt-4 text-2xl font-bold text-slate-900 print:text-[18pt]">{model.meetingTitle}</h1>

        {model.draftBanner ? (
          <p
            className="mt-3 rounded-md border px-3 py-2 text-sm font-semibold text-amber-900 print:break-inside-avoid"
            style={{ borderColor: model.tenantAccentColor, backgroundColor: "rgba(251, 191, 36, 0.12)" }}
            data-testid="protocol-draft-banner"
          >
            {model.draftBanner}
          </p>
        ) : null}

        {model.meetingDescription ? (
          <div className="mt-4 text-sm text-slate-700">
            <MeetingProtocolBodyText text={model.meetingDescription} />
          </div>
        ) : null}
      </header>

      <section className="mt-6 print:break-inside-avoid" data-testid="protocol-metadata">
        <SectionHeading>Sitzungsdetails</SectionHeading>
        <dl className="mt-3 grid gap-x-6 gap-y-2 sm:grid-cols-2">
          {model.metadataRows.map((row) => (
            <div key={row.label} className="text-sm">
              <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">{row.label}</dt>
              <dd className="mt-0.5 font-medium text-slate-900">{row.value}</dd>
            </div>
          ))}
        </dl>
      </section>

      <section data-testid="protocol-attendance">
        <SectionHeading>Teilnehmende</SectionHeading>
        {model.attendanceGroups.length > 0 ? (
          <div className="mt-3 space-y-4">
            {model.attendanceGroups.map((group) => (
              <div key={group.heading}>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{group.heading}</p>
                <ul className="mt-1 list-none space-y-1 text-sm text-slate-800">
                  {group.entries.map((entry, index) => (
                    <li key={`${group.heading}-${index}`}>
                      {entry.name}
                      {entry.role ? <span className="text-slate-600"> · {entry.role}</span> : null}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        ) : (
          <p className="mt-2 text-sm text-slate-600">{PROTOCOL_NOT_RECORDED}</p>
        )}
      </section>

      {model.agendaOverview.length > 0 ? (
        <section data-testid="protocol-agenda-overview">
          <SectionHeading>Traktandenübersicht</SectionHeading>
          <ol className="mt-3 list-decimal space-y-1 pl-5 text-sm text-slate-800">
            {model.agendaOverview.map((item) => (
              <li key={item.orderNumber}>
                <span className="font-medium text-slate-900">
                  {item.orderNumber}. {item.title}
                </span>
              </li>
            ))}
          </ol>
        </section>
      ) : null}

      <section data-testid="protocol-agenda-detail">
        <SectionHeading>Traktanden im Detail</SectionHeading>
        {model.agendaItems.length === 0 ? (
          <p className="mt-2 text-sm text-slate-600">{PROTOCOL_NOT_RECORDED}</p>
        ) : (
          <div className="mt-4 space-y-8">
            {model.agendaItems.map((item) => (
              <article
                key={item.id}
                className="print:break-inside-auto"
                data-testid={`protocol-agenda-item-${item.id}`}
              >
                <SubHeading>
                  {item.orderNumber}. {item.title}
                </SubHeading>
                {item.initiativeTitle ? (
                  <p className="mt-1 text-xs text-slate-500">Verknüpftes Vorhaben: {item.initiativeTitle}</p>
                ) : null}
                <p className="mt-1 text-xs text-slate-600">
                  Status: {item.statusLabel}
                  {item.durationLabel ? ` · Geplante Dauer: ${item.durationLabel}` : ""}
                  {item.presenterLabel ? ` · Referent/in: ${item.presenterLabel}` : ""}
                </p>
                {item.backgroundText ? (
                  <FieldBlock label="Hintergrund / Vorbereitung">
                    <MeetingProtocolBodyText text={item.backgroundText} />
                  </FieldBlock>
                ) : null}
                {item.protocolNotes ? (
                  <FieldBlock label="Protokollnotizen">
                    <MeetingProtocolBodyText text={item.protocolNotes} />
                  </FieldBlock>
                ) : null}
                {item.decisions.map((decision) => (
                  <DecisionBlock key={decision.id} decision={decision} />
                ))}
                {item.actions.map((action) => (
                  <ActionBlock key={action.id} action={action} />
                ))}
              </article>
            ))}
          </div>
        )}
      </section>

      {model.unlinkedDecisions.length > 0 ? (
        <section data-testid="protocol-unlinked-decisions">
          <SectionHeading>Weitere Beschlüsse</SectionHeading>
          {model.unlinkedDecisions.map((decision) => (
            <DecisionBlock key={decision.id} decision={decision} />
          ))}
        </section>
      ) : null}

      {model.unlinkedActions.length > 0 ? (
        <section data-testid="protocol-unlinked-actions">
          <SectionHeading>Weitere Massnahmen</SectionHeading>
          {model.unlinkedActions.map((action) => (
            <ActionBlock key={action.id} action={action} />
          ))}
        </section>
      ) : null}

      {model.actionOverviewTable.length > 0 ? (
        <section data-testid="protocol-action-overview">
          <SectionHeading>Massnahmenübersicht</SectionHeading>
          <div className="mt-3 overflow-x-auto">
            <table className="w-full min-w-[480px] border-collapse text-left text-sm">
              <thead className="print:table-header-group">
                <tr className="border-b border-slate-300 text-xs uppercase text-slate-600">
                  <th className="py-2 pr-3 font-semibold">Massnahme</th>
                  <th className="py-2 pr-3 font-semibold">Verantwortlich</th>
                  <th className="py-2 pr-3 font-semibold">Termin</th>
                  <th className="py-2 font-semibold">Status</th>
                </tr>
              </thead>
              <tbody>
                {model.actionOverviewTable.map((row, index) => (
                  <tr key={index} className="border-b border-slate-200">
                    <td className="py-2 pr-3 align-top text-slate-900">{row.title}</td>
                    <td className="py-2 pr-3 align-top text-slate-800">{row.ownerLabel}</td>
                    <td className="py-2 pr-3 align-top text-slate-800">{row.dueDateLabel}</td>
                    <td className="py-2 align-top text-slate-800">{row.statusLabel}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}

      {model.meetingTasks.length > 0 ? (
        <section data-testid="protocol-tasks">
          <SectionHeading>Verknüpfte Aufgaben</SectionHeading>
          <p className="mt-2 text-xs font-medium text-slate-600">
            Aktueller Aufgabenstand zum Exportzeitpunkt ({model.exportGeneratedAtLabel})
          </p>
          <ul className="mt-3 space-y-3">
            {model.meetingTasks.map((task) => (
              <li key={task.id} className="border-l-2 border-slate-300 pl-3 text-sm print:break-inside-avoid">
                <p className="font-medium text-slate-900">{task.title}</p>
                {task.contextReference ? (
                  <p className="text-xs text-slate-500">{task.contextReference}</p>
                ) : null}
                <p className="mt-1 text-xs text-slate-600">
                  Status: {task.statusLabel}
                  {task.dueAtLabel ? ` · Fällig: ${task.dueAtLabel}` : ""}
                  {task.assigneeLabels.length > 0
                    ? ` · Zuständig: ${task.assigneeLabels.join(", ")}`
                    : ""}
                </p>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <ProtocolClosingSections model={model} />
    </article>
  );
}
