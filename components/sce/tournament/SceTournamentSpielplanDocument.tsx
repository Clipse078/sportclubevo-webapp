import type { TournamentSpielplanViewModel } from "@/lib/tournaments/spielplan/types";

type Props = {
  model: TournamentSpielplanViewModel;
  dataTestId?: string;
};

/**
 * Print/PDF-oriented master Spielplan document (light, no app chrome).
 */
export default function SceTournamentSpielplanDocument({
  model,
  dataTestId = "sce-tournament-spielplan-document",
}: Props) {
  const { identity, pitches, matrixRows } = model;

  return (
    <article
      data-testid={dataTestId}
      className="mx-auto max-w-[1100px] bg-white px-8 py-10 text-neutral-900 print:px-6 print:py-8"
    >
      <header className="mb-6 border-b border-neutral-300 pb-4">
        {identity.tenantName ? (
          <p className="text-xs font-semibold uppercase tracking-widest text-neutral-600">
            {identity.tenantName}
          </p>
        ) : null}
        <h1 className="text-2xl font-bold">{identity.title}</h1>
        <p className="text-sm text-neutral-700">{identity.dateLabel}</p>
        {identity.location ? <p className="text-sm text-neutral-700">{identity.location}</p> : null}
        {identity.organizerName ? (
          <p className="text-sm text-neutral-600">Veranstalter: {identity.organizerName}</p>
        ) : null}
        <p className="mt-2 text-sm font-semibold uppercase tracking-wide">Master-Spielplan</p>
      </header>

      <table className="w-full border-collapse text-left text-sm">
        <thead>
          <tr>
            <th className="border border-neutral-400 bg-neutral-100 px-2 py-1.5 text-xs uppercase">
              Zeit
            </th>
            {pitches.map((pitch) => (
              <th
                key={pitch.pitchId}
                className="border border-neutral-400 bg-neutral-100 px-2 py-1.5 text-xs uppercase"
              >
                <span>{pitch.label}</span>
                {pitch.formatHint ? (
                  <span className="mt-0.5 block text-[10px] font-normal normal-case">
                    {pitch.formatHint}
                  </span>
                ) : null}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {matrixRows.map((row) => {
            if (row.kind === "ALL_PITCHES_BREAK") {
              return (
                <tr key={row.rowId}>
                  <td
                    colSpan={pitches.length + 1}
                    className="border border-neutral-400 bg-neutral-100 px-2 py-2 text-center text-xs font-bold uppercase"
                  >
                    {row.timeLabel} · {row.label}
                  </td>
                </tr>
              );
            }
            return (
              <tr key={row.rowId}>
                <td className="border border-neutral-400 px-2 py-1.5 align-top whitespace-nowrap">
                  <div className="font-medium">{row.timeLabel}</div>
                  {row.roundTitle ? (
                    <div className="text-[10px] uppercase text-neutral-600">{row.roundTitle}</div>
                  ) : null}
                </td>
                {pitches.map((pitch) => {
                  const cell = row.cellsByPitchId[pitch.pitchId] ?? { kind: "EMPTY" as const };
                  let text = "—";
                  if (cell.kind === "FIXTURE") {
                    text = cell.pairingLabel;
                    if (cell.result) {
                      text += ` (${cell.result.scoreSideA}:${cell.result.scoreSideB})`;
                    }
                  } else if (cell.kind === "PITCH_BLOCKED") {
                    text = cell.label;
                  }
                  return (
                    <td key={pitch.pitchId} className="border border-neutral-400 px-2 py-1.5 align-top">
                      {text}
                    </td>
                  );
                })}
              </tr>
            );
          })}
        </tbody>
      </table>
    </article>
  );
}
