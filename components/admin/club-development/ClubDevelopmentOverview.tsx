import type { ReactNode } from "react";
import Link from "next/link";
import {
  ArrowRight,
  CalendarDays,
  CheckSquare,
  ClipboardList,
  Flag,
  Workflow,
} from "lucide-react";
import { GoalSceIcon } from "@/components/icons/domain-sce-icon-components";
import { ProductDomainSceIcon } from "@/components/icons/ProductDomainSceIcon";
import { Badge } from "@/components/ui/Badge";
import { DashboardKpiCard } from "@/components/ui/dashboard/DashboardKpiCard";
import GovernancePendingCard from "@/components/admin/vereinsleitung/GovernancePendingCard";
import GovernanceStaleCard from "@/components/admin/vereinsleitung/GovernanceStaleCard";
import type { GovernanceOverviewData } from "@/lib/dashboard/governance-overview";
import type { InitiativeListItem } from "@/lib/initiatives/queries";
import type { MeetingListItem } from "@/lib/meetings/queries";
import { formatMeetingLocationDisplay } from "@/lib/meetings/meeting-presence-location";
import type { TargetListItem } from "@/lib/targets/queries";
import type { PersonalTaskDto } from "@/lib/tasks/types";
import {
  computeTargetMetricProgress,
} from "@/lib/club-development/overview-helpers";

export type ClubDevelopmentOverviewKpis = {
  activeTargetCount: number;
  activeInitiativeCount: number;
  upcomingMeetingCount: number;
  overdueActionCount: number;
  myOpenTaskCount: number | null;
  overdueTaskCount: number | null;
};

type ClubDevelopmentOverviewProps = {
  targets: TargetListItem[];
  initiatives: InitiativeListItem[];
  upcomingMeetings: MeetingListItem[];
  assignedTasks: PersonalTaskDto[];
  governance: GovernanceOverviewData;
  kpis: ClubDevelopmentOverviewKpis;
};

const TARGET_CATEGORY_LABELS: Record<string, string> = {
  SPORTLICHE_ENTWICKLUNG: "Sportliche Entwicklung",
  MITGLIEDERWACHSTUM: "Mitgliederwachstum",
  FINANZEN: "Finanzen & Infrastruktur",
  AUSBILDUNG: "Ausbildung",
  MEDIEN_SOZIALES: "Medien & Soziales",
  GOVERNANCE: "Governance",
};

const INITIATIVE_STATUS_LABELS: Record<string, string> = {
  IN_PROGRESS: "In Arbeit",
  ON_TRACK: "On Track",
  PLANNED: "Geplant",
  ON_HOLD: "Pausiert",
};

function formatSwissDate(date: Date) {
  return new Intl.DateTimeFormat("de-CH", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(date));
}

function EmptySection({ message }: { message: string }) {
  return (
    <div className="rounded-lg border border-dashed border-[var(--border)] bg-[var(--surface-2)] px-4 py-6 text-center text-sm text-[var(--muted)]">
      {message}
    </div>
  );
}

function SectionShell({
  title,
  href,
  linkLabel,
  children,
}: {
  title: string;
  href: string;
  linkLabel: string;
  children: ReactNode;
}) {
  return (
    <section className="rounded-xl border border-[var(--border)] bg-[var(--surface)] shadow-[var(--shadow-xs)] overflow-hidden">
      <div className="flex items-center justify-between border-b border-[var(--border)] bg-[var(--surface-2)] px-5 py-3.5">
        <h2 className="text-sm font-semibold text-[var(--foreground)]">{title}</h2>
        <Link
          href={href}
          className="inline-flex items-center gap-1 text-xs font-medium text-[var(--sce-primary)] hover:underline"
        >
          {linkLabel}
          <ArrowRight className="h-3 w-3" />
        </Link>
      </div>
      <div className="p-5 space-y-3">{children}</div>
    </section>
  );
}

export default function ClubDevelopmentOverview({
  targets,
  initiatives,
  upcomingMeetings,
  assignedTasks,
  governance,
  kpis,
}: ClubDevelopmentOverviewProps) {
  return (
    <div className="space-y-8">
      <KpiStrip kpis={kpis} />

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <ModuleShortcut
          title="Pläne & Ziele"
          description="Strategische Vereinsziele mit Kennzahlen und Review-Status."
          href="/vereinsleitung/targets"
          status="Verfügbar"
          icon={<GoalSceIcon className="h-4 w-4 text-[var(--sce-primary)]" />}
        />
        <ModuleShortcut
          title="Sitzungen"
          description="Meetings planen, Protokoll und Massnahmen verfolgen."
          href="/vereinsleitung/meetings"
          status="Verfügbar"
          icon={<CalendarDays className="h-4 w-4 text-[var(--sce-primary)]" />}
        />
        <ModuleShortcut
          title="Vorhaben & Aufgaben"
          description="Initiativen und operative Aufgaben — ein gemeinsamer Arbeitsbereich folgt."
          href="/vereinsleitung/vorhaben"
          status="In Arbeit"
          icon={<CheckSquare className="h-4 w-4 text-[var(--sce-warning)]" />}
        />
        <ModuleShortcut
          title="Prozesse & Richtlinien"
          description="Dokumentierte Abläufe — Persistenz und Freigabe folgen."
          href="/vereinsleitung/prozesse"
          status="Demnächst"
          icon={<Workflow className="h-4 w-4 text-[var(--muted)]" />}
        />
      </section>

      <div className="grid gap-6 xl:grid-cols-2">
        <SectionShell title="Relevante Ziele" href="/vereinsleitung/targets" linkLabel="Alle Ziele">
          {targets.length === 0 ? (
            <EmptySection message="Keine aktiven Ziele sichtbar." />
          ) : (
            targets.slice(0, 5).map((target) => {
              const progress = computeTargetMetricProgress(target.metrics);
              return (
                <Link
                  key={target.id}
                  href={`/vereinsleitung/targets/${target.id}`}
                  className="block rounded-lg border border-[var(--border)] px-4 py-3 transition hover:bg-[var(--surface-2)]"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-[var(--foreground)] truncate">
                        {target.title}
                      </p>
                      <p className="text-xs text-[var(--muted)] mt-0.5">
                        {TARGET_CATEGORY_LABELS[target.category] ?? target.category}
                        {target.reviewStage === "SUBMITTED" ? " · Zur Prüfung" : ""}
                      </p>
                    </div>
                    {progress !== null ? (
                      <span className="shrink-0 text-xs font-semibold text-[var(--sce-primary)]">
                        {progress}%
                      </span>
                    ) : null}
                  </div>
                </Link>
              );
            })
          )}
        </SectionShell>

        <SectionShell
          title="Aktive Initiativen"
          href="/vereinsleitung/initiativen"
          linkLabel="Alle Initiativen"
        >
          {initiatives.length === 0 ? (
            <EmptySection message="Keine laufenden Initiativen sichtbar." />
          ) : (
            initiatives.slice(0, 5).map((ini) => (
              <Link
                key={ini.id}
                href={`/vereinsleitung/initiativen/${ini.slug}`}
                className="flex items-start justify-between gap-3 rounded-lg border border-[var(--border)] px-4 py-3 transition hover:bg-[var(--surface-2)]"
              >
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-[var(--foreground)] truncate">
                    {ini.title}
                  </p>
                  {ini.owner ? (
                    <p className="text-xs text-[var(--muted)] mt-0.5">{ini.owner}</p>
                  ) : null}
                </div>
                <Badge variant="default" size="sm">
                  {INITIATIVE_STATUS_LABELS[ini.status] ?? ini.status}
                </Badge>
              </Link>
            ))
          )}
        </SectionShell>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <SectionShell
          title="Anstehende Sitzungen"
          href="/vereinsleitung/meetings"
          linkLabel="Alle Sitzungen"
        >
          {upcomingMeetings.length === 0 ? (
            <EmptySection message="Keine geplanten Sitzungen in Sicht." />
          ) : (
            upcomingMeetings.slice(0, 5).map((meeting) => (
              <Link
                key={meeting.id}
                href={`/vereinsleitung/meetings/${meeting.slug}`}
                className="flex items-center justify-between gap-3 rounded-lg border border-[var(--border)] px-4 py-3 transition hover:bg-[var(--surface-2)]"
              >
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-[var(--foreground)] truncate">
                    {meeting.title}
                  </p>
                  <p className="text-xs text-[var(--muted)] mt-0.5 flex items-center gap-1.5">
                    <CalendarDays className="h-3.5 w-3.5" />
                    {formatSwissDate(meeting.meetingDate)}
                    {meeting.location ? ` · ${formatMeetingLocationDisplay(meeting.location)}` : ""}
                  </p>
                </div>
                <ArrowRight className="h-4 w-4 text-[var(--muted)] shrink-0" />
              </Link>
            ))
          )}
        </SectionShell>

        <SectionShell title="Meine offenen Aufgaben" href="/dashboard/aufgaben" linkLabel="Aufgaben">
          {kpis.myOpenTaskCount === null ? (
            <EmptySection message="Keine Berechtigung für Aufgaben." />
          ) : assignedTasks.length === 0 ? (
            <EmptySection message="Keine zugewiesenen offenen Aufgaben." />
          ) : (
            assignedTasks.slice(0, 5).map((task) => (
              <Link
                key={task.id}
                href="/dashboard/aufgaben"
                className="block rounded-lg border border-[var(--border)] px-4 py-3 transition hover:bg-[var(--surface-2)]"
              >
                <p className="text-sm font-semibold text-[var(--foreground)]">{task.title}</p>
                {task.dueAt ? (
                  <p className="text-xs text-[var(--muted)] mt-0.5">
                    Fällig: {formatSwissDate(new Date(task.dueAt))}
                  </p>
                ) : (
                  <p className="text-xs text-[var(--muted)] mt-0.5">Ohne Frist</p>
                )}
              </Link>
            ))
          )}
        </SectionShell>
      </div>

      <section className="grid gap-5 xl:grid-cols-[minmax(0,1.9fr)_minmax(320px,0.9fr)]">
        <GovernancePendingCard
          pendingApprovals={governance.pendingApprovals}
          overdueActions={governance.overdueActions}
        />
        <GovernanceStaleCard
          staleTargets={governance.staleTargets}
          templateDrafts={governance.templateDrafts}
        />
      </section>
    </div>
  );
}

function ModuleShortcut({
  title,
  description,
  href,
  status,
  icon,
}: {
  title: string;
  description: string;
  href: string;
  status: "Verfügbar" | "In Arbeit" | "Demnächst";
  icon: ReactNode;
}) {
  const variant =
    status === "Verfügbar" ? "success" : status === "In Arbeit" ? "warning" : "default";

  return (
    <Link
      href={href}
      className="flex h-full flex-col rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-[var(--shadow-xs)] transition hover:border-[var(--sce-primary)]/40 hover:bg-[var(--surface-2)]"
    >
      <div className="flex items-start justify-between gap-2">
        <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-[var(--surface-2)]">
          {icon}
        </span>
        <Badge variant={variant} size="sm">
          {status}
        </Badge>
      </div>
      <h3 className="mt-3 text-sm font-semibold text-[var(--foreground)]">{title}</h3>
      <p className="mt-1.5 text-xs leading-relaxed text-[var(--text-2)]">{description}</p>
    </Link>
  );
}

function KpiStrip({ kpis }: { kpis: ClubDevelopmentOverviewKpis }) {
  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 xl:grid-cols-6">
      <DashboardKpiCard
        title="Aktive Ziele"
        value={String(kpis.activeTargetCount)}
        accent="primary"
        icon={<GoalSceIcon className="h-5 w-5" />}
        description="Status Aktiv, sichtbar für Sie"
      />
      <DashboardKpiCard
        title="Initiativen"
        value={String(kpis.activeInitiativeCount)}
        accent="info"
        icon={<Flag className="h-5 w-5" />}
        description="Laufende Vorhaben"
      />
      <DashboardKpiCard
        title="Sitzungen"
        value={String(kpis.upcomingMeetingCount)}
        accent="success"
        icon={<CalendarDays className="h-5 w-5" />}
        description="Geplant, ab heute"
      />
      <DashboardKpiCard
        title="Meeting-Massnahmen"
        value={String(kpis.overdueActionCount)}
        accent={kpis.overdueActionCount > 0 ? "danger" : "default"}
        icon={<ClipboardList className="h-5 w-5" />}
        description="Überfällig, offen"
      />
      <DashboardKpiCard
        title="Meine Aufgaben"
        value={kpis.myOpenTaskCount === null ? "—" : String(kpis.myOpenTaskCount)}
        accent="violet"
        icon={<ProductDomainSceIcon name="tasks" size={20} />}
        description={
          kpis.myOpenTaskCount === null ? "Keine Berechtigung" : "Zugewiesen, offen"
        }
      />
      <DashboardKpiCard
        title="Überfällige Aufgaben"
        value={kpis.overdueTaskCount === null ? "—" : String(kpis.overdueTaskCount)}
        accent={kpis.overdueTaskCount && kpis.overdueTaskCount > 0 ? "danger" : "default"}
        icon={<CheckSquare className="h-5 w-5" />}
        description={
          kpis.overdueTaskCount === null ? "Keine Berechtigung" : "Tenant-weit sichtbar"
        }
      />
    </div>
  );
}
