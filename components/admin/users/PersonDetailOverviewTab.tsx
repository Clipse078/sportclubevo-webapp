import Link from "next/link";
import type { PersonAccessStatus } from "@/lib/admin/users/person-access-status";

type TabLinks = {
  rollenFunktionen: string;
  bereiche: string;
  veranstaltungsFreigaben: string;
  zugriff: string;
};

type Props = {
  accessStatus: PersonAccessStatus;
  membershipJoinedLabel: string;
  tenantRoleNames: string[];
  scopedAssignmentCount: number;
  showClubEventGovernanceTab: boolean;
  tabLinks: TabLinks;
};

export default function PersonDetailOverviewTab({
  accessStatus,
  membershipJoinedLabel,
  tenantRoleNames,
  scopedAssignmentCount,
  showClubEventGovernanceTab,
  tabLinks,
}: Props) {
  return (
    <div className="space-y-4" data-testid="person-detail-overview">
      <p className="text-sm text-[var(--text-2)]">
        Kurzüberblick über Konto, Mitgliedschaft und wichtige Zuständigkeiten. Detaillierte
        Verwaltung erfolgt in den jeweiligen Bereichen.
      </p>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface-2)]/60 px-4 py-3">
          <p className="text-[0.68rem] font-semibold uppercase tracking-[0.1em] text-[var(--muted)]">
            Konto &amp; Mitgliedschaft
          </p>
          <ul className="mt-2 space-y-1 text-sm">
            <li>
              <span className="text-[var(--text-2)]">Status: </span>
              <span className="font-medium text-[var(--foreground)]">{accessStatus.primaryLabel}</span>
            </li>
            <li>
              <span className="text-[var(--text-2)]">Beigetreten: </span>
              <span className="font-medium text-[var(--foreground)]">{membershipJoinedLabel}</span>
            </li>
          </ul>
        </div>

        <div className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface-2)]/60 px-4 py-3">
          <p className="text-[0.68rem] font-semibold uppercase tracking-[0.1em] text-[var(--muted)]">
            Clubweite Rollen
          </p>
          {tenantRoleNames.length === 0 ? (
            <p className="mt-2 text-sm text-[var(--muted)]">Keine clubweiten Rollen zugewiesen.</p>
          ) : (
            <ul className="mt-2 list-inside list-disc text-sm text-[var(--foreground)]">
              {tenantRoleNames.map((name) => (
                <li key={name}>{name}</li>
              ))}
            </ul>
          )}
          <p className="mt-3 text-xs">
            <Link
              href={tabLinks.rollenFunktionen}
              className="font-semibold text-[var(--sce-primary)] hover:underline"
            >
              Rollen &amp; Funktionen verwalten
            </Link>
          </p>
        </div>

        <div className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface-2)]/60 px-4 py-3 sm:col-span-2">
          <p className="text-[0.68rem] font-semibold uppercase tracking-[0.1em] text-[var(--muted)]">
            Bereiche &amp; Zuständigkeiten
          </p>
          <p className="mt-2 text-sm text-[var(--foreground)]">
            {scopedAssignmentCount === 0
              ? "Keine bereichsbezogenen Zuständigkeiten."
              : `${scopedAssignmentCount} bereichsbezogene Zuständigkeit${scopedAssignmentCount === 1 ? "" : "en"}.`}
          </p>
          <p className="mt-3 text-xs">
            <Link
              href={tabLinks.bereiche}
              className="font-semibold text-[var(--sce-primary)] hover:underline"
            >
              Bereiche &amp; Zuständigkeiten öffnen
            </Link>
          </p>
        </div>

        {showClubEventGovernanceTab ? (
          <div className="rounded-[var(--radius-lg)] border border-[color-mix(in_srgb,var(--sce-accent-violet,#8b5cf6)_25%,var(--border))] bg-[var(--surface-2)]/60 px-4 py-3 sm:col-span-2">
            <p className="text-[0.68rem] font-semibold uppercase tracking-[0.1em] text-[var(--muted)]">
              Veranstaltungs-Freigaben
            </p>
            <p className="mt-2 text-sm text-[var(--text-2)]">
              Erstellberechtigung und Veröffentlichungsregeln für Veranstaltungen dieser Person.
            </p>
            <p className="mt-3 text-xs">
              <Link
                href={tabLinks.veranstaltungsFreigaben}
                className="font-semibold text-[var(--sce-primary)] hover:underline"
              >
                Veranstaltungs-Freigaben konfigurieren
              </Link>
            </p>
          </div>
        ) : null}
      </div>

      <p className="text-xs text-[var(--muted)]">
        Vollständige Berechtigungsmatrix unter{" "}
        <Link href={tabLinks.zugriff} className="font-semibold text-[var(--sce-primary)] hover:underline">
          Zugriff
        </Link>
        .
      </p>
    </div>
  );
}
