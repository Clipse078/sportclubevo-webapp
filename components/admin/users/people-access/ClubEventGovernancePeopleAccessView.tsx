import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import AdminSectionHeader from "@/components/admin/shared/AdminSectionHeader";
import ClubEventValidatorPoolSection from "@/components/admin/users/people-access/ClubEventValidatorPoolSection";
import {
  buildClubEventGovernanceUserDetailHref,
  CLUB_EVENT_FREIGABEN_HREF,
  CLUB_EVENT_GOVERNANCE_PEOPLE_ACCESS_HREF,
  type ClubEventCreatorGovernanceRow,
} from "@/lib/club-events/governance/club-event-governance-people-access-context";

type Props = {
  canManage: boolean;
  creatorRows: ClubEventCreatorGovernanceRow[];
};

export default function ClubEventGovernancePeopleAccessView({ canManage, creatorRows }: Props) {
  return (
    <div className="space-y-8" data-testid="club-event-governance-people-access">
      <AdminSectionHeader
        eyebrow="Veranstaltungen"
        title="Veranstaltungs-Freigaben"
        description="Lege fest, wer Veranstaltungen erstellen darf, wer eine Freigabe benötigt und wer freigeben darf."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Link href={CLUB_EVENT_FREIGABEN_HREF} className="fca-button-secondary inline-flex items-center gap-1.5 text-sm">
              <ArrowLeft className="h-3.5 w-3.5" />
              Zurück zu Freigaben
            </Link>
            <Link href="/dashboard/admin/people-access" className="fca-button-secondary text-sm">
              Personen &amp; Zugänge
            </Link>
          </div>
        }
      />

      <div className="space-y-6">
        <ClubEventValidatorPoolSection canManage={canManage} showAnyOneHint showEmptyState />

        <section
          className="space-y-3 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4"
          data-testid="club-event-creator-policy-overview"
        >
          <div className="space-y-1">
            <h2 className="text-sm font-semibold">Ersteller &amp; Veröffentlichung</h2>
            <p className="text-xs text-[var(--text-2)]">
              Personen mit Erstellberechtigung für Veranstaltungen und ihre Veröffentlichungsregel.
              Bearbeiten erfolgt in der Personendetailansicht.
            </p>
          </div>

          {creatorRows.length === 0 ? (
            <p
              className="rounded-lg border border-dashed border-[var(--border)] bg-[var(--surface-2)]/40 px-3 py-4 text-sm text-[var(--text-2)]"
              data-testid="club-event-creator-policy-empty"
            >
              Noch keine relevanten Erstellerregeln sichtbar. Weise einer Person die Berechtigung
              zur Veranstaltungsplanung zu oder öffne eine Person in{" "}
              <Link href="/dashboard/admin/people-access" className="font-semibold text-[var(--sce-primary)] hover:underline">
                Personen &amp; Zugänge
              </Link>
              .
            </p>
          ) : (
            <ul className="divide-y divide-[var(--border)] rounded-lg border border-[var(--border)]">
              {creatorRows.map((row) => (
                <li
                  key={row.personId}
                  className="flex flex-col gap-2 px-3 py-3 sm:flex-row sm:items-center sm:justify-between"
                  data-testid="club-event-creator-policy-row"
                  data-person-id={row.personId}
                >
                  <div className="min-w-0 space-y-1">
                    <p className="truncate text-sm font-semibold text-[var(--foreground)]">
                      {row.displayName}
                    </p>
                    <p className="text-xs text-[var(--text-2)]">
                      Veranstaltungen erstellen:{" "}
                      <span data-testid="club-event-creator-create-label">{row.createLabel}</span>
                    </p>
                    <p className="text-xs text-[var(--text-2)]">
                      Veröffentlichung:{" "}
                      <span data-testid="club-event-creator-publication-label">{row.publicationLabel}</span>
                    </p>
                  </div>
                  {row.userId && canManage ? (
                    <Link
                      href={buildClubEventGovernanceUserDetailHref(row.userId)}
                      className="fca-button-secondary shrink-0 text-xs"
                      data-testid="club-event-creator-policy-edit"
                    >
                      Einstellungen öffnen
                    </Link>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <p className="text-xs text-[var(--text-2)]">
        Vollständige Personenliste:{" "}
        <Link href="/dashboard/admin/people-access" className="font-semibold text-[var(--sce-primary)] hover:underline">
          Personen &amp; Zugänge
        </Link>
        . Diese Ansicht ist ein Einstieg über{" "}
        <Link href={CLUB_EVENT_GOVERNANCE_PEOPLE_ACCESS_HREF} className="font-semibold text-[var(--sce-primary)] hover:underline">
          Veranstaltungs-Freigaben
        </Link>
        .
      </p>
    </div>
  );
}
