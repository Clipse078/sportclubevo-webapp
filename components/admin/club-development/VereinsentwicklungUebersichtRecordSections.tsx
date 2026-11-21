import Link from "next/link";
import { MoreVertical } from "lucide-react";
import type { TargetStatus } from "@prisma/client";
import type { ClubStrategyListItemDto } from "@/lib/club-development/club-strategy-service";
import type { StrategyTargetOverview } from "@/lib/club-development/strategy-overview";
import type { VereinsentwicklungOverviewPreview } from "@/lib/club-development/vereinsentwicklung-overview-preview";
import type { VorhabenWorkspaceTaskRow } from "@/lib/club-development/vorhaben-workspace";
import { buildConnectedWorkspaceHref } from "@/lib/club-development/vereinsentwicklung-connected-workspace";
import { buildStrategieUndZieleHref } from "@/lib/club-development/vereinsentwicklung-workspace-routing";
import { buildZielDetailHref } from "@/lib/club-development/vereinsentwicklung-target-task-create-routing";
import { buildStrategieReturnHref } from "@/lib/club-development/vereinsentwicklung-create-routing";
import { CD_STRATEGY_PROGRESS_COPY } from "@/lib/club-development/strategy-progress-copy";
import { formatTargetStatusLabel } from "@/lib/targets/target-presentation";
import { mapVorhabenTaskRowToTableModel } from "@/lib/club-development/vereinsentwicklung-connected-task-table-mappers";
import SceClubDevelopmentEmptyState from "./SceClubDevelopmentEmptyState";
import SceClubDevelopmentSectionShell from "./SceClubDevelopmentSectionShell";
import SceCompletionProgressInline from "./SceCompletionProgressInline";
import VereinsentwicklungBacklogFortschrittHeader from "./VereinsentwicklungBacklogFortschrittHeader";
import VereinsentwicklungBacklogTableShell from "./VereinsentwicklungBacklogTableShell";
import VereinsentwicklungConnectedTaskTable from "./VereinsentwicklungConnectedTaskTable";
import VereinsentwicklungWorkspaceRecordRow from "./VereinsentwicklungWorkspaceRecordRow";
import {
  SCE_CD_OVERVIEW_SECTION_STACK_CLASS,
  SCE_CD_OVERVIEW_UNIFIED_GRID,
  SCE_CD_SECTION_BODY_COMPACT_CLASS,
} from "./sce-club-development-surface-styles";
import { CD_WORKSPACE_ORG_UNIT_QUERY } from "@/lib/club-development/vereinsentwicklung-connected-workspace";

type Props = {
  preview: VereinsentwicklungOverviewPreview;
  orgEinheitQuery: Record<string, string>;
};

function orgUnitIdFromQuery(orgEinheitQuery: Record<string, string>): string | null {
  return orgEinheitQuery[CD_WORKSPACE_ORG_UNIT_QUERY]?.trim() || null;
}

function StrategienSection({
  strategies,
  orgEinheitQuery,
}: {
  strategies: ClubStrategyListItemDto[];
  orgEinheitQuery: Record<string, string>;
}) {
  const hrefAll = buildConnectedWorkspaceHref("strategien", orgEinheitQuery);
  const orgQuery = orgEinheitQuery[CD_WORKSPACE_ORG_UNIT_QUERY];

  return (
    <SceClubDevelopmentSectionShell
      title="Strategien"
      href={hrefAll}
      linkLabel="Alle anzeigen"
      linkTestId="vereinsentwicklung-overview-strategien-all"
      testId="vereinsentwicklung-section-strategien"
      bodyClassName={SCE_CD_SECTION_BODY_COMPACT_CLASS}
    >
      {strategies.length === 0 ? (
        <SceClubDevelopmentEmptyState message="Keine Strategie sichtbar." testId="vereinsentwicklung-overview-strategien-empty" />
      ) : (
        <VereinsentwicklungBacklogTableShell
          testId="vereinsentwicklung-overview-strategien-list"
          gridClassName={SCE_CD_OVERVIEW_UNIFIED_GRID}
          header={
            <>
              <span>Referenz</span>
              <span>Titel</span>
              <span>Org-Einheit</span>
              <span aria-hidden />
              <span>{CD_STRATEGY_PROGRESS_COPY.goalAchievementLabel}</span>
              <span aria-hidden />
              <span className="sr-only">Aktionen</span>
            </>
          }
        >
            {strategies.map((strategy) => {
              const detailParams: Record<string, string | undefined> = { strategyId: strategy.id };
              if (orgQuery) detailParams[CD_WORKSPACE_ORG_UNIT_QUERY] = orgQuery;
              const detailHref = buildStrategieUndZieleHref("strategie", detailParams);
              const goalEmpty =
                strategy.goalAchievementCaption === CD_STRATEGY_PROGRESS_COPY.goalAchievementEmpty;
              return (
                <VereinsentwicklungWorkspaceRecordRow
                  key={strategy.id}
                  variant="strategy"
                  layout="overview"
                  publicReference={strategy.publicReference}
                  title={strategy.title}
                  titleHref={detailHref}
                  orgUnitLabel={strategy.scopeOrgUnitLabel}
                  progressSlot={
                    strategy.goalAchievementTotalCount > 0 ? (
                      <SceCompletionProgressInline
                        metricLabel={CD_STRATEGY_PROGRESS_COPY.goalAchievementLabel}
                        completedCount={strategy.goalAchievementCompletedCount}
                        totalCount={strategy.goalAchievementTotalCount}
                        countCaption={null}
                        emptyLabel={CD_STRATEGY_PROGRESS_COPY.goalAchievementEmpty}
                        countSuffix="erledigt"
                        captionPriority
                        testId={`overview-strategien-goal-progress-${strategy.id}`}
                      />
                    ) : (
                      <SceCompletionProgressInline
                        metricLabel={CD_STRATEGY_PROGRESS_COPY.goalAchievementLabel}
                        countCaption={goalEmpty ? null : strategy.goalAchievementCaption}
                        emptyLabel={CD_STRATEGY_PROGRESS_COPY.goalAchievementEmpty}
                        countSuffix="erledigt"
                        captionPriority
                        testId={`overview-strategien-goal-progress-${strategy.id}`}
                      />
                    )
                  }
                  testId={`overview-strategien-row-${strategy.id}`}
                  trailing={
                    <Link
                      href={detailHref}
                      className="inline-flex rounded-md p-1 text-[var(--muted)] hover:bg-[var(--surface-2)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[var(--sce-primary)]"
                      aria-label={`${strategy.title} öffnen`}
                    >
                      <MoreVertical className="h-4 w-4" aria-hidden />
                    </Link>
                  }
                />
              );
            })}
        </VereinsentwicklungBacklogTableShell>
      )}
    </SceClubDevelopmentSectionShell>
  );
}

function ZieleSection({
  targets,
  orgEinheitQuery,
}: {
  targets: StrategyTargetOverview[];
  orgEinheitQuery: Record<string, string>;
}) {
  const hrefAll = buildConnectedWorkspaceHref("ziele", orgEinheitQuery);
  const orgQuery = orgUnitIdFromQuery(orgEinheitQuery);

  return (
    <SceClubDevelopmentSectionShell
      title="Ziele"
      href={hrefAll}
      linkLabel="Alle anzeigen"
      linkTestId="vereinsentwicklung-overview-ziele-all"
      testId="vereinsentwicklung-section-ziele"
      bodyClassName={SCE_CD_SECTION_BODY_COMPACT_CLASS}
    >
      {targets.length === 0 ? (
        <SceClubDevelopmentEmptyState message="Keine strategischen Ziele sichtbar." testId="vereinsentwicklung-overview-ziele-empty" />
      ) : (
        <VereinsentwicklungBacklogTableShell
          testId="vereinsentwicklung-overview-ziele-list"
          gridClassName={SCE_CD_OVERVIEW_UNIFIED_GRID}
          header={
              <>
                <span>Referenz</span>
                <span>Titel</span>
                <span>Strategie</span>
                <span>Status</span>
                <VereinsentwicklungBacklogFortschrittHeader label={CD_STRATEGY_PROGRESS_COPY.taskProgressLabel} />
                <span>Verantwortlich</span>
                <span className="sr-only">Aktionen</span>
              </>
            }
          >
            {targets.map((target) => {
              const detailHref = buildZielDetailHref(target.id, orgQuery);
              const strategyHref =
                target.linkedClubStrategyId && target.linkedClubStrategyTitle
                  ? buildStrategieReturnHref({
                      orgUnitId: orgQuery,
                      strategyId: target.linkedClubStrategyId,
                    })
                  : null;
              const deliveryEmpty = target.deliveryProgressCaption === "Noch keine Aufgaben";
              return (
                <VereinsentwicklungWorkspaceRecordRow
                  key={target.id}
                  variant="target"
                  layout="overview"
                  publicReference={target.publicReference}
                  title={target.title}
                  titleHref={detailHref}
                  strategyLabel={target.linkedClubStrategyTitle ?? "—"}
                  strategyHref={strategyHref}
                  orgUnitLabel={target.orgUnitLabel}
                  responsibleLabel={target.responsibleLabel}
                  status={target.status as TargetStatus}
                  statusLabel={formatTargetStatusLabel(target.status)}
                  progressSlot={
                    <SceCompletionProgressInline
                      metricLabel={CD_STRATEGY_PROGRESS_COPY.taskProgressLabel}
                      countCaption={deliveryEmpty ? null : target.deliveryProgressCaption}
                      emptyLabel="Noch keine Aufgaben"
                      countSuffix="erledigt"
                      showUnitShortLabel={false}
                      captionPriority
                      testId={`overview-ziele-task-progress-${target.id}`}
                    />
                  }
                  testId={`overview-ziele-row-${target.id}`}
                  trailing={
                    <Link
                      href={detailHref}
                      className="inline-flex rounded-md p-1 text-[var(--muted)] hover:bg-[var(--surface-2)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[var(--sce-primary)]"
                      aria-label={`${target.title} öffnen`}
                    >
                      <MoreVertical className="h-4 w-4" aria-hidden />
                    </Link>
                  }
                />
              );
            })}
        </VereinsentwicklungBacklogTableShell>
      )}
    </SceClubDevelopmentSectionShell>
  );
}

function AufgabenSection({
  tasks,
  orgEinheitQuery,
}: {
  tasks: VorhabenWorkspaceTaskRow[];
  orgEinheitQuery: Record<string, string>;
}) {
  const hrefAll = buildConnectedWorkspaceHref("aufgaben", orgEinheitQuery);
  const tableRows = tasks.map(mapVorhabenTaskRowToTableModel);

  return (
    <SceClubDevelopmentSectionShell
      title="Aufgaben"
      href={hrefAll}
      linkLabel="Alle anzeigen"
      linkTestId="vereinsentwicklung-overview-aufgaben-all"
      testId="vereinsentwicklung-section-aufgaben"
      bodyClassName={SCE_CD_SECTION_BODY_COMPACT_CLASS}
    >
      {tableRows.length === 0 ? (
        <SceClubDevelopmentEmptyState message="Keine Aufgaben sichtbar." testId="vereinsentwicklung-overview-aufgaben-empty" />
      ) : (
        <VereinsentwicklungConnectedTaskTable
          rows={tableRows}
          layoutVariant="overview"
          showRowProgress={false}
          testId="vereinsentwicklung-overview-aufgaben-list"
        />
      )}
    </SceClubDevelopmentSectionShell>
  );
}

export default function VereinsentwicklungUebersichtRecordSections({ preview, orgEinheitQuery }: Props) {
  return (
    <div className={SCE_CD_OVERVIEW_SECTION_STACK_CLASS} data-testid="vereinsentwicklung-overview-record-sections">
      {preview.showStrategien ? (
        <StrategienSection strategies={preview.strategies} orgEinheitQuery={orgEinheitQuery} />
      ) : null}
      {preview.showZiele ? <ZieleSection targets={preview.targets} orgEinheitQuery={orgEinheitQuery} /> : null}
      {preview.showAufgaben ? (
        <AufgabenSection tasks={preview.tasks} orgEinheitQuery={orgEinheitQuery} />
      ) : null}
    </div>
  );
}