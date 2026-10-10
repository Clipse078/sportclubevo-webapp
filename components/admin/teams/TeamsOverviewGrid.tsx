"use client";
import { ProductDomainSceIcon } from "@/components/icons/ProductDomainSceIcon";

import { useMemo } from "react";
import Link from "next/link";
import { ChevronRight, Link2, Link2Off, PenLine } from "lucide-react";
import AdminAvatar from "@/components/admin/shared/AdminAvatar";

type TeamItem = {
  id: string;
  name: string;
  shortName?: string | null;
  alternativeName?: string | null;
  displayName?: string | null;
  compactName?: string | null;
  slug: string;
  category: string;
  genderGroup: string | null;
  ageGroup: string | null;
  sortOrder: number;
  isActive: boolean;
  websiteVisible: boolean;
  infoboardVisible: boolean;
  activeSeason: {
    seasonKey: string;
    seasonName: string;
    displayName: string;
    shortName: string | null;
    status: string;
  } | null;
  competition: {
    name: string;
    shortName: string | null;
  } | null;
  providerMapping: {
    provider: string;
    isActive: boolean;
    lastSyncedAt: string;
    source: string;
  } | null;
};

type TeamsOverviewGridProps = {
  teams: TeamItem[];
  selectedSeasonName?: string;
};

const CATEGORY_CONFIG: Record<string, { label: string; accentDot: string }> = {
  KINDERFUSSBALL: { label: "Kinderfussball", accentDot: "bg-amber-400" },
  JUNIOREN: { label: "Junioren", accentDot: "bg-blue-500" },
  FRAUEN: { label: "Frauen", accentDot: "bg-rose-500" },
  AKTIVE: { label: "Aktive", accentDot: "bg-orange-500" },
  SENIOREN: { label: "Senioren", accentDot: "bg-slate-400" },
  TRAININGSGRUPPE: { label: "Trainingsgruppe", accentDot: "bg-purple-500" },
};

/** Dark SCE meta chip — avoids legacy light Tailwind surfaces (Human UAT R3). */
export const TEAM_DIRECTORY_META_CHIP_ACTIVE =
  "border-emerald-500/35 bg-emerald-500/10 text-emerald-200/95";
export const TEAM_DIRECTORY_META_CHIP_INACTIVE =
  "border-[var(--border)] bg-[var(--surface-2)]/60 text-[var(--muted)]";
export const TEAM_DIRECTORY_META_CHIP_NEUTRAL =
  "border-[var(--border)] bg-[var(--surface-2)]/80 text-[var(--text-2)]";
export const TEAM_DIRECTORY_META_CHIP_WARNING =
  "border-amber-500/35 bg-amber-500/10 text-amber-200/95";

function getCategoryConfig(category: string) {
  return (
    CATEGORY_CONFIG[category] ?? {
      label: category,
      accentDot: "bg-slate-400",
    }
  );
}

function metaChipClass(active: boolean, tone: "default" | "warning" = "default") {
  if (tone === "warning") {
    return TEAM_DIRECTORY_META_CHIP_WARNING;
  }
  return active ? TEAM_DIRECTORY_META_CHIP_ACTIVE : TEAM_DIRECTORY_META_CHIP_INACTIVE;
}

function MetaChip({
  label,
  active,
  icon,
  title,
  tone = "default",
  testId,
}: {
  label: string;
  active?: boolean;
  icon?: React.ReactNode;
  title?: string;
  tone?: "default" | "warning";
  testId?: string;
}) {
  return (
    <span
      title={title}
      data-testid={testId}
      className={`inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-[0.6875rem] font-medium leading-none ${metaChipClass(active ?? false, tone)}`}
    >
      {icon}
      {label}
    </span>
  );
}

function ProviderMappingBadge({
  providerMapping,
}: {
  providerMapping: TeamItem["providerMapping"];
}) {
  if (!providerMapping) {
    return (
      <MetaChip
        testId="team-sync-manual"
        label="Manuell"
        icon={<PenLine className="h-3 w-3 shrink-0 opacity-80" aria-hidden />}
        tone="default"
        active={false}
      />
    );
  }

  if (!providerMapping.isActive) {
    return (
      <MetaChip
        testId="team-sync-inactive"
        label={`${providerMapping.provider} inaktiv`}
        icon={<Link2Off className="h-3 w-3 shrink-0" aria-hidden />}
        tone="warning"
        title={`Zuletzt synchronisiert: ${new Date(providerMapping.lastSyncedAt).toLocaleString("de-CH")}`}
      />
    );
  }

  return (
    <MetaChip
      testId="team-sync-active"
      label={providerMapping.provider}
      icon={<Link2 className="h-3 w-3 shrink-0" aria-hidden />}
      active
      title={`Zuletzt synchronisiert: ${new Date(providerMapping.lastSyncedAt).toLocaleString("de-CH")}`}
    />
  );
}

function TeamPublicationMeta({
  websiteVisible,
  infoboardVisible,
  providerMapping,
}: {
  websiteVisible: boolean;
  infoboardVisible: boolean;
  providerMapping: TeamItem["providerMapping"];
}) {
  return (
    <div
      className="flex max-w-full flex-wrap items-center gap-1.5 rounded-lg border border-[var(--border)] bg-[var(--surface-2)]/50 px-2 py-1.5"
      data-testid="team-publication-meta"
    >
      <ProviderMappingBadge providerMapping={providerMapping} />
      <span className="hidden h-3 w-px bg-[var(--border)] sm:inline" aria-hidden />
      <MetaChip
        testId="team-publication-web"
        label="Web"
        active={websiteVisible}
        icon={<ProductDomainSceIcon name="website" size={12} />}
      />
      <MetaChip
        testId="team-publication-board"
        label="Board"
        active={infoboardVisible}
        icon={<ProductDomainSceIcon name="infoboard" size={12} />}
      />
    </div>
  );
}

function TeamRowStatus({ isActive }: { isActive: boolean }) {
  if (!isActive) {
    return (
      <span
        className={`inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-[0.625rem] font-semibold uppercase tracking-wide ${TEAM_DIRECTORY_META_CHIP_INACTIVE}`}
        data-testid="team-row-status"
      >
        Archiviert
      </span>
    );
  }

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-[0.625rem] font-semibold uppercase tracking-wide ${TEAM_DIRECTORY_META_CHIP_ACTIVE}`}
      data-testid="team-row-status"
    >
      <span className="h-1.5 w-1.5 rounded-full bg-emerald-400/90" aria-hidden />
      Aktiv
    </span>
  );
}

export default function TeamsOverviewGrid({
  teams,
  selectedSeasonName,
}: TeamsOverviewGridProps) {
  const grouped = useMemo(() => {
    const map = new Map<string, TeamItem[]>();

    for (const team of teams) {
      const existing = map.get(team.category) ?? [];
      existing.push(team);
      map.set(team.category, existing);
    }

    return Array.from(map.entries()).map(([category, items]) => ({
      category,
      config: getCategoryConfig(category),
      teams: items,
      activeCount: items.filter((t) => t.isActive).length,
    }));
  }, [teams]);

  if (teams.length === 0) {
    return (
      <div className="sce-detail-section">
        <div className="sce-detail-section-body flex flex-col items-center justify-center gap-3 py-12 text-center">
          <p className="font-semibold text-[var(--foreground)]">
            Keine Teams gefunden
          </p>
          <p className="text-sm text-[var(--muted)]">
            {selectedSeasonName
              ? `Für die Saison „${selectedSeasonName}" sind noch keine Teams erfasst.`
              : "Noch keine Teams im System erfasst."}
          </p>
          <Link href="/dashboard/teams/new" className="fca-button-primary mt-2">
            Erstes Team anlegen
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl space-y-8" data-testid="teams-overview-grid">
      {grouped.map(({ category, config, teams: categoryTeams, activeCount }) => (
        <section key={category} data-testid={`team-category-${category}`}>
          <div className="mb-3 flex flex-wrap items-baseline gap-x-3 gap-y-1">
            <div className="flex items-center gap-2">
              <span className={`h-2 w-2 flex-shrink-0 rounded-full ${config.accentDot}`} />
              <h3 className="text-sm font-semibold tracking-tight text-[var(--foreground)]">
                {config.label}
              </h3>
              <span className="sce-count-badge">{categoryTeams.length}</span>
            </div>
            {activeCount < categoryTeams.length ? (
              <span className="text-xs text-[var(--muted)]">
                {activeCount} aktiv
              </span>
            ) : null}
          </div>

          <div className="sce-integrated-list">
            {categoryTeams.map((team, idx) => {
              const isLast = idx === categoryTeams.length - 1;
              const displayName = team.displayName ?? team.name;
              const compactName =
                team.compactName ?? team.shortName ?? null;
              const contextLine = [config.label, team.genderGroup]
                .filter(Boolean)
                .join(" · ");

              return (
                <Link
                  key={team.id}
                  href={`/dashboard/teams/${team.id}`}
                  data-testid={`team-directory-row-${team.id}`}
                  className={`group grid grid-cols-1 gap-3 px-4 py-3.5 transition hover:bg-[var(--surface-2)]/80 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[var(--sce-primary)] sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center sm:gap-4 sm:px-5 sm:py-3.5 ${
                    !isLast ? "border-b border-[var(--border)]" : ""
                  }`}
                >
                  <div className="flex min-w-0 items-start gap-3">
                    <AdminAvatar
                      name={compactName ?? displayName ?? team.name}
                      size="sm"
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                        <span className="truncate text-[0.9375rem] font-semibold leading-snug text-[var(--foreground)]">
                          {displayName}
                        </span>
                        {compactName && compactName !== displayName ? (
                          <span
                            className="rounded-md border border-[var(--border)] bg-[var(--surface-2)]/80 px-1.5 py-0.5 text-[0.6875rem] font-medium text-[var(--text-2)]"
                            title="Kurzname"
                          >
                            {compactName}
                          </span>
                        ) : null}
                        <TeamRowStatus isActive={team.isActive} />
                      </div>
                      {contextLine ? (
                        <p className="mt-0.5 text-xs text-[var(--muted)]">
                          {contextLine}
                        </p>
                      ) : null}
                      <p className="mt-0.5 truncate text-xs font-medium text-[var(--text-2)]">
                        {team.competition
                          ? team.competition.name
                          : "Kein Wettbewerb"}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between gap-2 sm:justify-end">
                    <TeamPublicationMeta
                      websiteVisible={team.websiteVisible}
                      infoboardVisible={team.infoboardVisible}
                      providerMapping={team.providerMapping}
                    />
                    <ChevronRight
                      className="h-4 w-4 shrink-0 text-[var(--muted)] transition group-hover:translate-x-0.5 group-hover:text-[var(--blue)]"
                      aria-hidden
                    />
                  </div>
                </Link>
              );
            })}
          </div>
        </section>
      ))}
    </div>
  );
}
