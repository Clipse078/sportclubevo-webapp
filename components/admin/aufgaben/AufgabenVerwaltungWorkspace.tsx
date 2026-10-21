import AufgabenManagementWorkspace from "./AufgabenManagementWorkspace";
import RequirementsManagementWorkspace from "./RequirementsManagementWorkspace";
import VerwaltungTypeFilterNav from "./VerwaltungTypeFilterNav";
import VerwaltungUnifiedActionList from "./VerwaltungUnifiedActionList";
import AufgabenDomainLoadError from "./AufgabenDomainLoadError";
import type { VerwaltungTypeFilterParam } from "@/lib/personal-actions/aufgaben-scope";
import type { TaskAssigneeOption } from "@/lib/tasks/queries";
import type {
  TaskManagementListItem,
  TaskManagementSummary,
  TaskSeriesManagementRow,
} from "@/lib/tasks/management-service";
import type {
  RequirementManagementListItem,
  RequirementManagementSummary,
} from "@/lib/requirements/management-service";
import type { RequirementManagementQueryState } from "@/lib/requirements/management-navigation";
import type {
  TaskManagementQueryState,
  TaskManagementSort,
} from "@/lib/tasks/management-navigation";
import type { TaskOrgUnitPickerOption } from "@/lib/tasks/task-org-options";
import { buildVerwaltungUnifiedRows } from "@/lib/aufgaben/verwaltung-unified-presentation";
import { requirementDetailHref } from "@/lib/requirements/management-navigation";
import { taskWorkspaceHref } from "@/lib/tasks/task-navigation";

type Props = {
  typeFilter: VerwaltungTypeFilterParam;
  showTasks: boolean;
  showRequirements: boolean;
  locale: string;
  timeZone: string;
  taskQuery: TaskManagementQueryState;
  taskSort: TaskManagementSort;
  taskSummary: TaskManagementSummary;
  taskItems: TaskManagementListItem[];
  taskSeriesRows: TaskSeriesManagementRow[];
  taskTotalCount: number;
  taskPage: number;
  taskPageCount: number;
  assigneeOptions: TaskAssigneeOption[];
  orgUnitFilterOptions: TaskOrgUnitPickerOption[];
  canCreateTask: boolean;
  canAssign: boolean;
  canManageTasks: boolean;
  tenantWideVisibility: boolean;
  taskLoadError: boolean;
  reqQuery: RequirementManagementQueryState;
  reqSummary: RequirementManagementSummary;
  reqItems: RequirementManagementListItem[];
  reqTotalCount: number;
  reqPage: number;
  reqPageCount: number;
  canCreateRequirement: boolean;
  reqLoadError: boolean;
};

export default function AufgabenVerwaltungWorkspace({
  typeFilter,
  showTasks,
  showRequirements,
  locale,
  timeZone,
  taskQuery,
  taskSort,
  taskSummary,
  taskItems,
  taskSeriesRows,
  taskTotalCount,
  taskPage,
  taskPageCount,
  assigneeOptions,
  orgUnitFilterOptions,
  canCreateTask,
  canAssign,
  canManageTasks,
  tenantWideVisibility,
  taskLoadError,
  reqQuery,
  reqSummary,
  reqItems,
  reqTotalCount,
  reqPage,
  reqPageCount,
  canCreateRequirement,
  reqLoadError,
}: Props) {
  const effectiveFilter =
    typeFilter === "tasks" && !showTasks
      ? "requirements"
      : typeFilter === "requirements" && !showRequirements
        ? "tasks"
        : typeFilter;

  const unifiedRows =
    effectiveFilter === "all"
      ? buildVerwaltungUnifiedRows({
          tasks: showTasks && !taskLoadError ? taskItems : [],
          requirements: showRequirements && !reqLoadError ? reqItems : [],
          locale,
          timeZone,
          taskHref: taskWorkspaceHref,
          requirementHref: requirementDetailHref,
        })
      : [];

  const unifiedAllDomainsFailed =
    effectiveFilter === "all" &&
    (showTasks || showRequirements) &&
    (!showTasks || taskLoadError) &&
    (!showRequirements || reqLoadError) &&
    ((showTasks && taskLoadError) || (showRequirements && reqLoadError));

  const unifiedPartialTaskError =
    effectiveFilter === "all" &&
    showTasks &&
    showRequirements &&
    taskLoadError &&
    !reqLoadError;
  const unifiedPartialReqError =
    effectiveFilter === "all" &&
    showTasks &&
    showRequirements &&
    reqLoadError &&
    !taskLoadError;

  const unifiedFatalContext =
    unifiedAllDomainsFailed && showTasks && showRequirements
      ? ("AUFGABEN_VERWALTUNG_UNIFIED_LOAD" as const)
      : unifiedAllDomainsFailed && showTasks
        ? ("AUFGABEN_MANAGEMENT_LOAD" as const)
        : unifiedAllDomainsFailed && showRequirements
          ? ("AUFGABEN_REQUIREMENTS_LOAD" as const)
          : null;

  return (
    <div className="space-y-4" data-testid="aufgaben-verwaltung-workspace">
      <VerwaltungTypeFilterNav
        filter={effectiveFilter}
        showTasks={showTasks}
        showRequirements={showRequirements}
      />

      {effectiveFilter === "all" ? (
        <>
          {unifiedFatalContext ? (
            <AufgabenDomainLoadError
              context={unifiedFatalContext}
              testId="verwaltung-unified-load-error"
            />
          ) : null}
          {unifiedPartialTaskError ? (
            <AufgabenDomainLoadError
              context="AUFGABEN_MANAGEMENT_LOAD"
              testId="verwaltung-unified-task-load-error"
            />
          ) : null}
          {unifiedPartialReqError ? (
            <AufgabenDomainLoadError
              context="AUFGABEN_REQUIREMENTS_LOAD"
              testId="verwaltung-unified-requirements-load-error"
            />
          ) : null}
          <VerwaltungUnifiedActionList rows={unifiedRows} loadError={unifiedAllDomainsFailed} />
        </>
      ) : null}

      {effectiveFilter === "tasks" && showTasks ? (
        <AufgabenManagementWorkspace
          locale={locale}
          timeZone={timeZone}
          query={taskQuery}
          sort={taskSort}
          summary={taskSummary}
          items={taskItems}
          seriesRows={taskSeriesRows}
          totalCount={taskTotalCount}
          page={taskPage}
          pageCount={taskPageCount}
          assigneeOptions={assigneeOptions}
          orgUnitFilterOptions={orgUnitFilterOptions}
          canCreate={canCreateTask}
          canAssign={canAssign}
          canManage={canManageTasks}
          tenantWideVisibility={tenantWideVisibility}
          loadError={taskLoadError}
        />
      ) : null}

      {effectiveFilter === "requirements" && showRequirements ? (
        <RequirementsManagementWorkspace
          locale={locale}
          timeZone={timeZone}
          query={reqQuery}
          summary={reqSummary}
          items={reqItems}
          totalCount={reqTotalCount}
          page={reqPage}
          pageCount={reqPageCount}
          canCreate={canCreateRequirement}
          canCreateInModal={false}
          loadError={reqLoadError}
        />
      ) : null}
    </div>
  );
}
