"use client";

import { ClubCrest } from "@/components/sporting-activity/ClubCrest";
import { buildClubIdentity } from "@/lib/sporting-activity-design/club-identity";
import type { PublicTournamentViewModel } from "@/lib/tournaments/public/types";
import PublicTournamentCopyLinkButton from "./PublicTournamentCopyLinkButton";

type Props = {
  model: PublicTournamentViewModel;
  tenantName: string;
  absolutePublicUrl: string;
};

function formatDateLine(iso: string, timeZone: string): string {
  return new Date(iso).toLocaleDateString("de-CH", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone,
  });
}

function formatTime(iso: string, timeZone: string): string {
  return new Date(iso).toLocaleTimeString("de-CH", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone,
  });
}

export default function PublicTournamentExperience({
  model,
  tenantName,
  absolutePublicUrl,
}: Props) {
  const timeZone = "Europe/Zurich";
  const { tournament } = model;

  return (
    <div
      className="mx-auto min-h-screen max-w-3xl bg-[var(--background)] px-4 py-6 text-[var(--foreground)] sm:px-6"
      data-testid="public-tournament-experience"
    >
      <header className="space-y-3 border-b border-[var(--border)] pb-6">
        <p className="text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">
          {tenantName}
        </p>
        <h1 className="text-2xl font-semibold leading-tight sm:text-3xl">{tournament.title}</h1>
        <p className="text-sm text-[var(--text-2)]">{formatDateLine(tournament.startAt, timeZone)}</p>
        {tournament.location ? (
          <p className="text-sm text-[var(--text-2)]">{tournament.location}</p>
        ) : null}
        {tournament.organizerName ? (
          <div className="flex items-center gap-2 text-sm">
            <ClubCrest
              identity={buildClubIdentity({
                displayName: tournament.organizerName,
                logoUrl: tournament.organizerLogoUrl,
              })}
              density="compact"
              decorative
            />
            <span>{tournament.organizerName}</span>
          </div>
        ) : null}
        <PublicTournamentCopyLinkButton absoluteUrl={absolutePublicUrl} />
      </header>

      {model.participants.length > 0 ? (
        <section className="py-6" aria-labelledby="public-tournament-participants-heading">
          <h2 id="public-tournament-participants-heading" className="mb-3 text-lg font-semibold">
            Teilnehmer
          </h2>
          <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {model.participants.map((p) => (
              <li
                key={p.id}
                className="flex min-h-11 items-center gap-2 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2"
              >
                <ClubCrest
                  identity={buildClubIdentity({
                    id: p.id,
                    displayName: p.displayName,
                    logoUrl: p.crestUrl,
                  })}
                  density="compact"
                  decorative
                />
                <span className="text-sm font-medium">{p.displayName}</span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section className="py-6" aria-labelledby="public-tournament-schedule-heading">
        <h2 id="public-tournament-schedule-heading" className="mb-3 text-lg font-semibold">
          Spielplan
        </h2>
        {model.scheduleSections.length === 0 ? (
          <p className="text-sm text-[var(--text-2)]">Noch kein öffentlicher Spielplan verfügbar.</p>
        ) : (
          <div className="space-y-6">
            {model.scheduleSections.map((section) => (
              <div key={section.sectionId}>
                <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-[var(--muted)]">
                  {section.title}
                </h3>
                <ul className="space-y-2">
                  {section.entries.map((entry) => {
                    if (entry.kind === "BREAK") {
                      return (
                        <li
                          key={entry.breakId}
                          className="rounded-lg border border-dashed border-[var(--border)] bg-[var(--surface-2)] px-3 py-3 text-sm"
                        >
                          <span className="font-medium">{entry.label}</span>
                          <span className="text-[var(--text-2)]">
                            {" "}
                            · {formatTime(entry.startUtc, timeZone)}–
                            {formatTime(entry.endUtc, timeZone)}
                          </span>
                        </li>
                      );
                    }
                    const score =
                      entry.result?.state === "COMPLETED" &&
                      entry.result.scoreSideA != null &&
                      entry.result.scoreSideB != null
                        ? `${entry.result.scoreSideA}:${entry.result.scoreSideB}`
                        : null;
                    return (
                      <li
                        key={entry.fixtureId}
                        className={`rounded-lg border px-3 py-3 ${
                          entry.scheduleState === "COMPLETED"
                            ? "border-[var(--border)] bg-[var(--surface-2)]"
                            : "border-[var(--border)] bg-[var(--surface)]"
                        }`}
                        aria-label={entry.accessibleLabel}
                      >
                        <div className="mb-2 flex flex-wrap items-center justify-between gap-2 text-xs text-[var(--text-2)]">
                          <span>
                            {formatTime(entry.startUtc, timeZone)} · {entry.pitchLabel}
                          </span>
                          {entry.groupLabel ? <span>{entry.groupLabel}</span> : null}
                        </div>
                        <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2 text-sm font-medium">
                          <div className="flex items-center justify-end gap-2 text-right">
                            {!entry.sideA.isPlaceholder ? (
                              <ClubCrest
                                identity={buildClubIdentity({
                                  displayName: entry.sideA.label,
                                  logoUrl: entry.sideA.crestUrl,
                                })}
                                density="compact"
                                decorative
                              />
                            ) : null}
                            <span className={entry.sideA.isPlaceholder ? "italic text-[var(--text-2)]" : ""}>
                              {entry.sideA.label}
                            </span>
                          </div>
                          <span
                            className="min-w-[3rem] text-center tabular-nums"
                            aria-label={score ? `Ergebnis ${score}` : "Noch nicht gespielt"}
                          >
                            {score ?? "–"}
                          </span>
                          <div className="flex items-center gap-2">
                            <span className={entry.sideB.isPlaceholder ? "italic text-[var(--text-2)]" : ""}>
                              {entry.sideB.label}
                            </span>
                            {!entry.sideB.isPlaceholder ? (
                              <ClubCrest
                                identity={buildClubIdentity({
                                  displayName: entry.sideB.label,
                                  logoUrl: entry.sideB.crestUrl,
                                })}
                                density="compact"
                                decorative
                              />
                            ) : null}
                          </div>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
          </div>
        )}
      </section>

      {model.groupStandings.length > 0 ? (
        <section className="py-6" aria-labelledby="public-tournament-standings-heading">
          <h2 id="public-tournament-standings-heading" className="mb-3 text-lg font-semibold">
            Gruppentabelle
          </h2>
          <div className="space-y-6">
            {model.groupStandings.map((group) => (
              <div key={group.groupId} className="overflow-x-auto rounded-lg border border-[var(--border)]">
                <p className="border-b border-[var(--border)] bg-[var(--surface-2)] px-3 py-2 text-sm font-semibold">
                  {group.groupLabel}
                </p>
                <table className="w-full min-w-[320px] text-left text-sm">
                  <thead>
                    <tr className="border-b border-[var(--border)] text-xs uppercase text-[var(--muted)]">
                      <th className="px-2 py-2">#</th>
                      <th className="px-2 py-2">Team</th>
                      <th className="px-2 py-2 text-right">Sp</th>
                      <th className="px-2 py-2 text-right">Pkt</th>
                    </tr>
                  </thead>
                  <tbody>
                    {group.rows.map((row) => (
                      <tr key={row.participantId} className="border-b border-[var(--border)] last:border-0">
                        <td className="px-2 py-2 tabular-nums">{row.position}</td>
                        <td className="px-2 py-2">
                          {row.displayName}
                          {row.tiedAtPosition ? (
                            <span className="ml-1 text-xs text-[var(--muted)]">(gleich)</span>
                          ) : null}
                        </td>
                        <td className="px-2 py-2 text-right tabular-nums">{row.played}</td>
                        <td className="px-2 py-2 text-right tabular-nums font-semibold">{row.points}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}
