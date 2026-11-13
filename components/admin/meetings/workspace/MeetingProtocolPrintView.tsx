import type { ReactNode } from "react";
import type {
  MeetingProtocolDocumentAction,
  MeetingProtocolDocumentDecision,
  MeetingProtocolDocumentModel,
} from "@/lib/meetings/meeting-protocol-document";
import { PROTOCOL_NOT_RECORDED } from "@/lib/meetings/meeting-protocol-labels";
import { formatAgendaHeading } from "@/lib/meetings/agenda-display-order";
import MeetingProtocolBodyText from "@/components/admin/meetings/workspace/MeetingProtocolBodyText";

type Props = {
  model: MeetingProtocolDocumentModel;
};

function SectionHeading({
  index,
  children,
  accentColor,
}: {
  index?: number;
  children: ReactNode;
  accentColor: string;
}) {
  return (
    <h2
      className="mt-5 border-b pb-1 text-sm font-bold text-slate-900 print:break-after-avoid"
      style={{ borderColor: accentColor }}
    >
      {index != null ? `${index}. ` : ""}
      {children}
    </h2>
  );
}

function SubHeading({ children }: { children: ReactNode }) {
  return <h3 className="mt-3 text-base font-semibold text-slate-900 print:break-after-avoid">{children}</h3>;
}

const PROTOCOL_TABLE_HEAD_CLASS =
  "border-b-2 border-slate-300 bg-sky-50 text-[10px] uppercase text-slate-800";
const PROTOCOL_TH_CLASS = "py-1.5 pr-3 font-semibold text-slate-900";

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
    <div className="mt-2 print:break-inside-avoid">
      <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">{label}</p>
      <div className="mt-0.5 text-sm leading-relaxed text-slate-800">{children}</div>
    </div>
  );
}

function DecisionBlock({ decision }: { decision: MeetingProtocolDocumentDecision }) {
  return (
    <div
      className="mt-3 rounded border border-slate-200 bg-slate-50/60 p-3 print:break-inside-avoid"
      data-testid={`protocol-decision-${decision.id}`}
    >
      <p className="text-[10px] font-bold uppercase tracking-wide text-slate-600">Beschluss</p>
      <p className="mt-1 font-semibold text-slate-900">{decision.title}</p>
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
      <p className="mt-1.5 text-xs text-slate-600">
        Status: {decision.statusLabel}
        {decision.ownerLabel ? ` · Verantwortlich: ${decision.ownerLabel}` : ""}
      </p>
      {decision.approvalRequired ? (
        <div className="mt-1.5 text-xs text-slate-600">
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
      className="mt-2 border-l-2 border-slate-300 pl-3 print:break-inside-avoid"
      data-testid={`protocol-action-${action.id}`}
    >
      <p className="text-[10px] font-bold uppercase tracking-wide text-slate-600">Massnahme</p>
      <p className="mt-0.5 font-medium text-slate-900">{action.title}</p>
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

function ProtocolClosingSections({ model }: { model: MeetingProtocolDocumentModel }) {
  const hasVotes = model.protocolApprovalVoteRows.length > 0;
  const hasFootnote = Boolean(model.protocolApprovalFootnote);

  return (
    <>
      {hasVotes ? (
        <section data-testid="protocol-approval-votes">
          <SectionHeading accentColor={model.tenantAccentColor}>Protokollfreigabe — Stimmverhalten</SectionHeading>
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
        <p className="mt-3 text-xs text-slate-500" data-testid="protocol-approval-footnote">
          {model.protocolApprovalFootnote}
        </p>
      ) : null}
      <footer
        className="protocol-page-footer mt-8 border-t border-slate-200 pt-3 text-xs text-slate-500 print:break-inside-avoid"
        data-testid="protocol-footer"
      >
        <p>{model.tenantFooterLine}</p>
        <p className="mt-0.5">Exportiert am {model.exportGeneratedAtLabel}</p>
        <p className="mt-0.5 opacity-80">{model.secondaryFooter}</p>
      </footer>
    </>
  );
}

export default function MeetingProtocolPrintView({ model }: Props) {
  const accentStyle = { color: model.tenantAccentColor, borderColor: model.tenantAccentColor };
  let sectionIndex = 0;
  const nextSection = () => {
    sectionIndex += 1;
    return sectionIndex;
  };

  return (
    <article
      className="sce-protocol-document mx-auto max-w-[210mm] bg-white px-6 py-6 text-[11pt] leading-relaxed text-slate-900 print:bg-white print:px-[15mm] print:py-[10mm] print:text-[10.5pt] print:text-slate-900"
      data-testid="meeting-protocol-print"
    >
      <header className="border-b-2 pb-4 print:break-inside-avoid" style={{ borderColor: model.tenantAccentColor }}>
        <div className="flex items-start gap-4">
          {model.tenantLogoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={model.tenantLogoUrl}
              alt=""
              className="h-16 w-auto max-w-[120px] shrink-0 object-contain object-left print:h-[22mm]"
            />
          ) : (
            <div
              className="flex h-16 w-16 shrink-0 items-center justify-center rounded border border-slate-200 bg-slate-50 text-center text-[10px] font-semibold uppercase text-slate-600 print:h-[22mm] print:w-[22mm]"
              aria-hidden
            >
              {model.tenantName.slice(0, 10)}
            </div>
          )}
          <div className="min-w-0 flex-1">
            <p className="text-xl font-bold tracking-tight text-slate-900 print:text-[16pt]">{model.tenantName}</p>
            <p className="mt-0.5 text-sm font-semibold uppercase tracking-wide text-slate-700">
              <span style={accentStyle}>{model.documentLabel}</span>
            </p>
            <p className="mt-1 text-lg font-bold text-slate-900 print:text-[13pt]">{model.meetingTitle}</p>
            {model.draftBanner ? (
              <p
                className="mt-2 inline-block rounded border px-2 py-1 text-xs font-semibold text-amber-900"
                style={{ borderColor: model.tenantAccentColor, backgroundColor: "rgba(251, 191, 36, 0.12)" }}
                data-testid="protocol-draft-banner"
              >
                {model.draftBanner}
              </p>
            ) : model.showHeaderApprovalState ? (
              <p className="mt-2 text-xs font-medium text-slate-600" data-testid="protocol-approval-state">
                {model.approvalStateLabel}
              </p>
            ) : null}
          </div>
        </div>

        {model.meetingDescription ? (
          <div className="mt-3 text-sm text-slate-700">
            <MeetingProtocolBodyText text={model.meetingDescription} />
          </div>
        ) : null}
      </header>

      <section className="mt-4 print:break-inside-avoid" data-testid="protocol-metadata">
        <SectionHeading index={nextSection()} accentColor={model.tenantAccentColor}>
          Sitzungsdetails
        </SectionHeading>
        <dl className="mt-2 grid gap-x-4 gap-y-1 sm:grid-cols-2">
          {model.metadataRows.map((row) => (
            <div key={row.label} className="text-sm">
              <dt className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">{row.label}</dt>
              <dd className="font-medium text-slate-900">{row.value}</dd>
            </div>
          ))}
        </dl>
      </section>

      <section data-testid="protocol-attendance">
        <SectionHeading index={nextSection()} accentColor={model.tenantAccentColor}>
          Teilnehmende
        </SectionHeading>
        {model.attendanceRows.length > 0 ? (
          <div className="mt-2 overflow-x-auto">
            <table className="w-full min-w-[420px] border-collapse text-left text-sm">
              <thead className="print:table-header-group">
                <tr className={PROTOCOL_TABLE_HEAD_CLASS}>
                  <th className={PROTOCOL_TH_CLASS}>Name</th>
                  <th className={PROTOCOL_TH_CLASS}>Rolle</th>
                  <th className={`${PROTOCOL_TH_CLASS} pr-0`}>Anwesenheit / Einladung</th>
                </tr>
              </thead>
              <tbody>
                {model.attendanceRows.map((row, index) => (
                  <tr key={index} className="border-b border-slate-100">
                    <td className="py-1.5 pr-3 text-slate-900">{row.name}</td>
                    <td className="py-1.5 pr-3 text-slate-800">{row.roleLabel}</td>
                    <td className="py-1.5 text-slate-800">{row.attendanceLabel}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="mt-1 text-sm text-slate-600">{PROTOCOL_NOT_RECORDED}</p>
        )}
      </section>

      {model.agendaOverview.length > 0 ? (
        <section data-testid="protocol-agenda-overview">
          <SectionHeading index={nextSection()} accentColor={model.tenantAccentColor}>
            Traktandenübersicht
          </SectionHeading>
          <ul className="mt-2 list-none space-y-0.5 text-sm text-slate-800">
            {model.agendaOverview.map((item) => (
              <li key={item.orderNumber}>
                <span className="font-medium text-slate-900">
                  {formatAgendaHeading(item.orderNumber, item.title)}
                </span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section data-testid="protocol-agenda-detail">
        <SectionHeading index={nextSection()} accentColor={model.tenantAccentColor}>
          Traktanden im Detail
        </SectionHeading>
        {model.agendaItems.length === 0 ? (
          <p className="mt-1 text-sm text-slate-600">{PROTOCOL_NOT_RECORDED}</p>
        ) : (
          <div className="mt-3 space-y-5">
            {model.agendaItems.map((item) => (
              <article
                key={item.id}
                className="print:break-inside-auto"
                data-testid={`protocol-agenda-item-${item.id}`}
              >
                <SubHeading>{formatAgendaHeading(item.orderNumber, item.title)}</SubHeading>
                {item.initiativeTitle ? (
                  <p className="text-xs text-slate-500">Verknüpftes Vorhaben: {item.initiativeTitle}</p>
                ) : null}
                <p className="text-xs text-slate-600">
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
          <SectionHeading accentColor={model.tenantAccentColor}>Weitere Beschlüsse</SectionHeading>
          {model.unlinkedDecisions.map((decision) => (
            <DecisionBlock key={decision.id} decision={decision} />
          ))}
        </section>
      ) : null}

      {model.unlinkedActions.length > 0 ? (
        <section data-testid="protocol-unlinked-actions">
          <SectionHeading accentColor={model.tenantAccentColor}>Weitere Massnahmen</SectionHeading>
          {model.unlinkedActions.map((action) => (
            <ActionBlock key={action.id} action={action} />
          ))}
        </section>
      ) : null}

      {model.referencedPendenzen.length > 0 ? (
        <section data-testid="protocol-pendenzen">
          <SectionHeading index={nextSection()} accentColor={model.tenantAccentColor}>
            Pendenzenübersicht
          </SectionHeading>
          <p className="mt-1 text-xs font-medium text-slate-700">{model.pendenzenOverviewFootnote}</p>
          <div className="mt-2 overflow-x-auto">
            <table className="w-full min-w-[480px] border-collapse text-left text-sm">
              <thead className="print:table-header-group">
                <tr className={PROTOCOL_TABLE_HEAD_CLASS}>
                  <th className={PROTOCOL_TH_CLASS}>Titel</th>
                  <th className={PROTOCOL_TH_CLASS}>Quelle</th>
                  <th className={PROTOCOL_TH_CLASS}>Verantwortlich</th>
                  <th className={PROTOCOL_TH_CLASS}>Termin</th>
                  <th className={`${PROTOCOL_TH_CLASS} pr-0`}>Status</th>
                </tr>
              </thead>
              <tbody>
                {model.referencedPendenzen.map((row, index) => (
                  <tr key={index} className="border-b border-slate-200">
                    <td className="py-1.5 pr-3 align-top">
                      <span className="font-medium text-slate-900">{row.title}</span>
                      {row.compactSummary ? (
                        <p className="mt-0.5 text-xs text-slate-600">{row.compactSummary}</p>
                      ) : null}
                    </td>
                    <td className="py-1.5 pr-3 align-top text-slate-800">{row.sourceTypeLabel}</td>
                    <td className="py-1.5 pr-3 align-top text-slate-800">{row.ownerLabel}</td>
                    <td className="py-1.5 pr-3 align-top text-slate-800">{row.dueDateLabel}</td>
                    <td className="py-1.5 align-top text-slate-800">{row.statusLabel}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}

      <ProtocolClosingSections model={model} />
    </article>
  );
}
