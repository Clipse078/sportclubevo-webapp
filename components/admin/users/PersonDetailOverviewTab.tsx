import Link from "next/link";
import type { PersonAccessStatus } from "@/lib/admin/users/person-access-status";
import type { PersonClubEventGovernanceOverview } from "@/lib/admin/users/person-detail-governance-summary";

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
  clubEventGovernanceOverview: PersonClubEventGovernanceOverview | null;
  accessOverviewLine: string;
  tabLinks: TabLinks;
};

export default function PersonDetailOverviewTab({
  accessStatus,
  membershipJoinedLabel,
  tenantRoleNames,
  scopedAssignmentCount,
  showClubEventGovernanceTab,
  clubEventGovernanceOverview,
  accessOverviewLine,
  tabLinks,
}: Props) {
  const primaryRolesPreview =
    tenantRoleNames.length === 0
      ? "Keine clubweiten Rollen zugewiesen"
      : tenantRoleNames.length <= 3
        ? tenantRoleNames.join(" · ")
        : `${tenantRoleNames.slice(0, 2).join(" · ")} · +${tenantRoleNames.length - 2} weitere`;

  return (
    <div className="space-y-4" data-testid="person-detail-overview">
      <p className="text-sm text-[var(--text-2)]">
        Administrative Kurzübersicht — was diese Person derzeit darf und wie sie im Verein
        eingerichtet ist. Detailkonfiguration erfolgt in den verlinkten Bereichen.
      </p>

      <div className="grid gap-3 sm:grid-cols-2">
        <section className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface-2)]/60 px-4 py-3">
          <h3 className="text-[0.68rem] font-semibold uppercase tracking-[0.1em] text-[var(--muted)]">
            Konto &amp; Mitgliedschaft
          </h3>
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
        </section>

        <section className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface-2)]/60 px-4 py-3">
          <h3 className="text-[0.68rem] font-semibold uppercase tracking-[0.1em] text-[var(--muted)]">
            Rollen &amp; Funktionen
          </h3>
          <p className="mt-2 text-sm text-[var(--foreground)]">{primaryRolesPreview}</p>
          <p className="mt-3 text-xs">
            <Link
              href={tabLinks.rollenFunktionen}
              className="font-semibold text-[var(--sce-primary)] hover:underline"
              data-testid="person-overview-link-rollen"
            >
              Rollen &amp; Funktionen verwalten
            </Link>
          </p>
        </section>

        <section className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface-2)]/60 px-4 py-3">
          <h3 className="text-[0.68rem] font-semibold uppercase tracking-[0.1em] text-[var(--muted)]">
            Bereiche &amp; Zuständigkeiten
          </h3>
          <p className="mt-2 text-sm text-[var(--foreground)]">
            {scopedAssignmentCount === 0
              ? "Keine zusätzlichen Zuständigkeiten"
              : `${scopedAssignmentCount} bereichsbezogene Zuständigkeit${scopedAssignmentCount === 1 ? "" : "en"}`}
          </p>
          <p className="mt-3 text-xs">
            <Link
              href={tabLinks.bereiche}
              className="font-semibold text-[var(--sce-primary)] hover:underline"
              data-testid="person-overview-link-bereiche"
            >
              Bereiche &amp; Zuständigkeiten öffnen
            </Link>
          </p>
        </section>

        <section className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface-2)]/60 px-4 py-3">
          <h3 className="text-[0.68rem] font-semibold uppercase tracking-[0.1em] text-[var(--muted)]">
            Zugriff
          </h3>
          <p className="mt-2 text-sm text-[var(--foreground)]">{accessOverviewLine}</p>
          <p className="mt-3 text-xs">
            <Link
              href={tabLinks.zugriff}
              className="font-semibold text-[var(--sce-primary)] hover:underline"
              data-testid="person-overview-link-zugriff"
            >
              Effektiven Zugriff prüfen
            </Link>
          </p>
        </section>

        {showClubEventGovernanceTab && clubEventGovernanceOverview ? (
          <section
            className="rounded-[var(--radius-lg)] border border-[color-mix(in_srgb,var(--sce-accent-violet,#8b5cf6)_25%,var(--border))] bg-[var(--surface-2)]/60 px-4 py-3 sm:col-span-2"
            data-testid="person-overview-club-event-governance"
          >
            <h3 className="text-[0.68rem] font-semibold uppercase tracking-[0.1em] text-[var(--muted)]">
              Veranstaltungs-Freigaben
            </h3>
            <ul className="mt-2 space-y-1 text-sm">
              <li>
                <span className="text-[var(--text-2)]">Veranstaltungen erstellen: </span>
                <span className="font-medium text-[var(--foreground)]">
                  {clubEventGovernanceOverview.createLabel}
                </span>
              </li>
              <li>
                <span className="text-[var(--text-2)]">Veröffentlichung: </span>
                <span className="font-medium text-[var(--foreground)]">
                  {clubEventGovernanceOverview.publicationLabel}
                </span>
              </li>
            </ul>
            <p className="mt-3 text-xs">
              <Link
                href={tabLinks.veranstaltungsFreigaben}
                className="font-semibold text-[var(--sce-primary)] hover:underline"
                data-testid="person-overview-link-veranstaltungs-freigaben"
              >
                Veranstaltungs-Freigaben konfigurieren
              </Link>
            </p>
          </section>
        ) : null}
      </div>
    </div>
  );
}
