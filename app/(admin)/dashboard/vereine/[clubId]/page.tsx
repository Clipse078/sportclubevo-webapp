import Link from "next/link";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";
import { ChevronRight, Globe, Hash, MapPin, Merge, Pencil, Plus, Users } from "lucide-react";

import { prisma } from "@/lib/db/prisma";
import { requireAnyPermission } from "@/lib/permissions/require-any-permission";
import { hasPermission } from "@/lib/permissions/has-permission";
import { PERMISSIONS } from "@/lib/permissions/permissions";
import { getActiveTenant } from "@/lib/tenants/active-tenant";
import { createClubDirectoryQueryDatabase } from "@/lib/club-directory/prisma-adapter";
import { getExternalClubById } from "@/lib/club-directory/query-service";
import { resolveExternalTeamLogoUrl } from "@/lib/club-directory/logo";
import { formatExternalTeamCompetitionContext } from "@/lib/club-directory/competition-context";
import { ClubLogo } from "@/components/admin/club-directory/ClubLogo";
import { LogoUploadCard } from "@/components/admin/club-directory/LogoUploadCard";
import { ProviderLinkPanel } from "@/components/admin/club-directory/ProviderLinkPanel";
import {
  ClubDirectoryArchiveButton,
  ClubDirectoryRestoreButton,
} from "@/components/admin/club-directory/ArchiveRestoreControls";
import { formatClubMetaValue } from "@/components/admin/club-directory/ClubDetailMetaValue";
import { Badge, Button } from "@/components/ui";
import { PageShell, PageBreadcrumbs, PageHeader, PageActions, SectionCard } from "@/components/ui/page";

type Props = { params: Promise<{ clubId: string }> };

function MetaRow({
  label,
  value,
  href,
  icon,
}: {
  label: string;
  value: string;
  href?: string;
  icon: ReactNode;
}) {
  const isMissing = value === "Nicht hinterlegt";
  return (
    <div className="min-w-0">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-[var(--muted)]">{label}</p>
      <div className="mt-1 flex items-center gap-1.5 text-sm text-[var(--foreground)]">
        <span className="text-[var(--muted)]" aria-hidden>{icon}</span>
        {href && !isMissing ? (
          <a
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            className="truncate font-medium text-[var(--sce-primary)] hover:underline"
          >
            {value}
          </a>
        ) : (
          <span className={isMissing ? "text-[var(--muted)]" : "font-medium"}>{value}</span>
        )}
      </div>
    </div>
  );
}

export default async function ClubDetailPage({ params }: Props) {
  const session = await requireAnyPermission([PERMISSIONS.ORG_VIEW, PERMISSIONS.ORG_MANAGE]);
  const canManage = hasPermission(session, PERMISSIONS.ORG_MANAGE);

  const tenant = await getActiveTenant();
  if (!tenant) notFound();

  const { clubId } = await params;
  const club = await getExternalClubById(createClubDirectoryQueryDatabase(prisma), {
    tenantId: tenant.id,
    id: clubId,
  });

  if (!club) notFound();

  const isArchived = club.archivedAt !== null;
  const primaryMapping = club.providerMappings[0];
  const websiteDisplay = formatClubMetaValue(club.website);
  const locationDisplay = formatClubMetaValue(club.location);

  return (
    <PageShell fullWidth>
      <div className="flex flex-col gap-6" data-testid="club-detail-page">
        <PageBreadcrumbs
          items={[
            { label: "Dashboard", href: "/dashboard" },
            { label: "Vereine", href: "/dashboard/vereine" },
            { label: club.name },
          ]}
        />

        <div className="flex flex-wrap items-start justify-between gap-4">
          <PageHeader
            eyebrow="Organisation · Vereine"
            title={club.name}
            description={club.shortName ?? undefined}
            badge={
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant={club.hasProviderMapping ? "info" : "outline"}>
                  {club.hasProviderMapping ? "Anbieter-verknüpft" : "Manuell erfasst"}
                </Badge>
                {isArchived ? <Badge variant="default">Archiviert</Badge> : <Badge variant="success">Aktiv</Badge>}
              </div>
            }
            className="mb-0"
          />
          <PageActions>
            <Link href="/dashboard/vereine">
              <Button type="button" variant="secondary" size="default">Zurück</Button>
            </Link>
            {canManage && !isArchived ? (
              <Link href={`/dashboard/vereine/${club.id}/merge`}>
                <Button type="button" variant="secondary" iconLeft={<Merge className="h-4 w-4" />}>
                  Duplikate zusammenführen
                </Button>
              </Link>
            ) : null}
            {canManage ? (
              <Link href={`/dashboard/vereine/${club.id}/edit`}>
                <Button type="button" variant="primary" iconLeft={<Pencil className="h-4 w-4" />}>
                  Bearbeiten
                </Button>
              </Link>
            ) : null}
          </PageActions>
        </div>

        <div className="grid gap-6 xl:grid-cols-[minmax(0,1.7fr)_minmax(280px,1fr)]">
          <div className="flex min-w-0 flex-col gap-6">
            <SectionCard title="Vereinsprofil" noPadding>
              <div className="flex flex-col gap-6 px-5 py-5 lg:flex-row lg:items-start">
                <div className="flex shrink-0 flex-col items-start gap-3" data-testid="club-profile-crest">
                  <ClubLogo logoUrl={club.logoUrl} name={club.name} size="lg" />
                  {canManage ? (
                    <LogoUploadCard
                      resource="club"
                      id={club.id}
                      name={club.name}
                      logoUrl={club.logoUrl}
                      showCrest={false}
                    />
                  ) : null}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="border-b border-[var(--border)] pb-4">
                    <h2 className="text-xl font-semibold text-[var(--foreground)]">{club.name}</h2>
                    {club.shortName ? (
                      <p className="mt-0.5 text-sm text-[var(--muted)]">{club.shortName}</p>
                    ) : null}
                    <p className="mt-2 flex items-center gap-1.5 text-sm text-[var(--text-2)]">
                      <Users className="h-4 w-4 text-[var(--muted)]" aria-hidden />
                      {club.teamCount} Team{club.teamCount === 1 ? "" : "s"}
                    </p>
                  </div>
                  <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                    <MetaRow label="Ort" value={locationDisplay} icon={<MapPin className="h-3.5 w-3.5" />} />
                    <MetaRow
                      label="Website"
                      value={websiteDisplay}
                      href={club.website?.trim() || undefined}
                      icon={<Globe className="h-3.5 w-3.5" />}
                    />
                    {primaryMapping ? (
                      <>
                        <MetaRow
                          label="Anbieter"
                          value={primaryMapping.provider}
                          icon={<Hash className="h-3.5 w-3.5" />}
                        />
                        <MetaRow
                          label="Anbieter-ID"
                          value={String(primaryMapping.providerClubId)}
                          icon={<Hash className="h-3.5 w-3.5" />}
                        />
                      </>
                    ) : null}
                  </div>
                </div>
              </div>
            </SectionCard>

            <SectionCard
              title="Teams"
              description={`${club.teamCount} Team${club.teamCount === 1 ? "" : "s"} in diesem Verein`}
              headerActions={
                canManage && !isArchived ? (
                  <Link href={`/dashboard/vereine/${club.id}/teams/new`}>
                    <Button type="button" variant="primary" size="sm" iconLeft={<Plus className="h-3.5 w-3.5" />}>
                      Team erfassen
                    </Button>
                  </Link>
                ) : undefined
              }
              noPadding
            >
              {club.teams.length === 0 ? (
                <p className="px-5 py-10 text-center text-sm text-[var(--muted)]">
                  Noch keine Teams für diesen Verein erfasst.
                </p>
              ) : (
                <div className="divide-y divide-[var(--border)]">
                  {club.teams.map((team) => {
                    const effectiveLogoUrl = resolveExternalTeamLogoUrl(team, club);
                    const competitionContext = formatExternalTeamCompetitionContext(team.competitionContext);
                    return (
                      <Link
                        key={team.id}
                        href={`/dashboard/vereine/teams/${team.id}/edit`}
                        className="group flex items-center gap-4 px-5 py-4 transition hover:bg-[var(--surface-2)]"
                      >
                        <ClubLogo logoUrl={effectiveLogoUrl} name={team.name} size="sm" className="opacity-90" />
                        <div className="min-w-0 flex-1">
                          {competitionContext ? (
                            <p className="text-sm font-semibold text-[var(--foreground)] group-hover:text-[var(--sce-primary)]">
                              {competitionContext}
                            </p>
                          ) : (
                            <p className="text-sm font-semibold text-[var(--foreground)] group-hover:text-[var(--sce-primary)]">
                              {team.name}
                            </p>
                          )}
                          <p className="mt-0.5 truncate text-xs text-[var(--muted)]">
                            {competitionContext ? team.name : team.categoryLabel ?? "Keine Kategorie"}
                          </p>
                          <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                            {team.categoryLabel && competitionContext ? (
                              <Badge variant="outline" size="sm">{team.categoryLabel}</Badge>
                            ) : null}
                            <Badge
                              variant={team.providerMappings.length > 0 ? "info" : "outline"}
                              size="sm"
                              className="font-normal"
                            >
                              {team.providerMappings.length > 0 ? "Anbieter-verknüpft" : "Manuell"}
                            </Badge>
                            {team.archivedAt ? (
                              <Badge variant="default" size="sm">Archiviert</Badge>
                            ) : null}
                          </div>
                        </div>
                        <ChevronRight className="h-5 w-5 shrink-0 text-[var(--muted)]" aria-hidden />
                      </Link>
                    );
                  })}
                </div>
              )}
            </SectionCard>
          </div>

          <aside className="flex min-w-0 flex-col gap-6">
            {canManage ? (
              <SectionCard title="Provider-Verknüpfung" description="Anbieter-Identität (z. B. SFV)">
                <ProviderLinkPanel
                  resource="club"
                  id={club.id}
                  mappings={club.providerMappings.map((m) => ({
                    id: m.id,
                    provider: m.provider,
                    providerClubId: m.providerClubId,
                    providerClubName: m.providerClubName,
                    providerIsActive: m.providerIsActive,
                    lastSyncedAt: m.lastSyncedAt ? m.lastSyncedAt.toISOString() : null,
                  }))}
                />
              </SectionCard>
            ) : null}

            {canManage ? (
              <SectionCard title="Status">
                <p className="mb-3 text-sm font-medium text-[var(--foreground)]">
                  {isArchived ? "Archiviert" : "Aktiv"}
                </p>
                {isArchived ? (
                  <ClubDirectoryRestoreButton resource="club" id={club.id} name={club.name} />
                ) : (
                  <ClubDirectoryArchiveButton resource="club" id={club.id} name={club.name} />
                )}
              </SectionCard>
            ) : null}
          </aside>
        </div>
      </div>
    </PageShell>
  );
}
