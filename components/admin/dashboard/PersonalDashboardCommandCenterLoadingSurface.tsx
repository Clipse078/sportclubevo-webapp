import { SCE_SKELETON_BONE_CLASS } from "@/lib/design-system/sce-feedback-status-micro-ux";
import {
  SCE_WORKSPACE_SECTION_BODY_CLASS,
  SCE_WORKSPACE_SECTION_HEADER_CLASS,
  SCE_WORKSPACE_SECTION_SHELL_CLASS,
} from "@/lib/sce/sce-workspace-surface-styles";
import { cn } from "@/lib/cn";

function Bone({ className }: { className?: string }) {
  return <div className={cn(SCE_SKELETON_BONE_CLASS, className)} aria-hidden="true" />;
}

function SectionChromeSkeleton({
  rowCount = 3,
  testId,
}: {
  rowCount?: number;
  testId: string;
}) {
  return (
    <section
      className={SCE_WORKSPACE_SECTION_SHELL_CLASS}
      data-testid={testId}
      aria-busy="true"
    >
      <div className={SCE_WORKSPACE_SECTION_HEADER_CLASS}>
        <Bone className="h-3.5 w-40" />
        <Bone className="h-3 w-24" />
      </div>
      <div className={SCE_WORKSPACE_SECTION_BODY_CLASS}>
        <ul className="space-y-2" aria-hidden>
          {Array.from({ length: rowCount }).map((_, index) => (
            <li key={index} className="rounded-lg border border-[var(--border)] px-4 py-3">
              <Bone className="mb-2 h-3 w-3/5 max-w-xs" />
              <Bone className="h-2.5 w-2/5 max-w-[9rem]" />
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

function ProgrammeRowSkeleton() {
  return (
  <li className="flex gap-3 rounded-lg border border-[var(--border)] px-3 py-2.5">
      <Bone className="h-12 w-12 shrink-0 rounded-lg" />
      <div className="min-w-0 flex-1 space-y-2">
        <Bone className="h-3 w-16" />
        <Bone className="h-3.5 w-4/5 max-w-sm" />
        <Bone className="h-2.5 w-1/2 max-w-[10rem]" />
      </div>
    </li>
  );
}

export type PersonalDashboardCommandCenterLoadingMode =
  | "full"
  | "workspace"
  | "attention"
  | "programme"
  | "tasks"
  | "quick-access"
  | "secondary";

export type PersonalDashboardCommandCenterLoadingSurfaceProps = {
  mode?: PersonalDashboardCommandCenterLoadingMode;
  className?: string;
};

/**
 * SCE-aligned personal dashboard loading surface (CD reference layout).
 * Replaces obsolete four-panel cockpit card fallback.
 */
export function PersonalDashboardCommandCenterLoadingSurface({
  mode = "full",
  className,
}: PersonalDashboardCommandCenterLoadingSurfaceProps) {
  const showAttention =
    mode === "full" || mode === "workspace" || mode === "attention";
  const showProgrammePair =
    mode === "full" || mode === "workspace" || mode === "programme" || mode === "tasks";
  const showProgrammeOnly = mode === "programme";
  const showTasksOnly = mode === "tasks";
  const showQuickAccess = mode === "full" || mode === "quick-access";
  const showSecondary = mode === "full" || mode === "secondary";

  return (
    <div
      className={cn("flex min-w-0 flex-col gap-6", className)}
      data-testid="personal-dashboard-command-center-loading"
      aria-busy="true"
      aria-label="Persönliche Übersicht wird geladen"
    >
      {showAttention ? (
        <SectionChromeSkeleton
          rowCount={2}
          testId="personal-dashboard-attention-section-loading"
        />
      ) : null}

      {showProgrammePair ? (
        <div
          className={cn(
            showProgrammeOnly || showTasksOnly
              ? "min-w-0"
              : "min-w-0 space-y-6",
            mode === "full" || mode === "workspace" ? "space-y-6" : undefined,
          )}
          data-sce-dashboard-layout={
            mode === "full" || mode === "workspace" ? "cd-reference" : undefined
          }
          data-testid="personal-dashboard-workspace-loading"
        >
          <div
            className={cn(
              "grid items-start gap-6 xl:grid-cols-2",
              (showProgrammeOnly || showTasksOnly) && "grid-cols-1 xl:grid-cols-1",
            )}
            data-testid="personal-dashboard-programme-tasks-grid-loading"
          >
            {showProgrammeOnly || mode === "full" || mode === "workspace" ? (
              <section
                className={SCE_WORKSPACE_SECTION_SHELL_CLASS}
                data-testid="personal-dashboard-programme-section-loading"
              >
                <div className={SCE_WORKSPACE_SECTION_HEADER_CLASS}>
                  <Bone className="h-3.5 w-44" />
                  <Bone className="h-3 w-28" />
                </div>
                <div className={SCE_WORKSPACE_SECTION_BODY_CLASS}>
                  <ul className="space-y-2">
                    <ProgrammeRowSkeleton />
                    <ProgrammeRowSkeleton />
                  </ul>
                </div>
              </section>
            ) : null}

            {!showProgrammeOnly && (showTasksOnly || mode === "full" || mode === "workspace") ? (
              <SectionChromeSkeleton
                rowCount={3}
                testId="personal-dashboard-tasks-section-loading"
              />
            ) : null}
          </div>
        </div>
      ) : null}

      {showQuickAccess ? (
        <section
          className={SCE_WORKSPACE_SECTION_SHELL_CLASS}
          data-testid="personal-quick-access-loading"
        >
          <div className={SCE_WORKSPACE_SECTION_HEADER_CLASS}>
            <Bone className="h-3.5 w-32" />
            <Bone className="h-7 w-20 rounded-md" />
          </div>
          <div className="grid gap-3 p-5 sm:grid-cols-2 xl:grid-cols-3">
            {Array.from({ length: 3 }).map((_, index) => (
              <Bone key={index} className="h-14 w-full rounded-lg" />
            ))}
          </div>
        </section>
      ) : null}

      {showSecondary ? (
        <Bone className="h-10 w-full max-w-md rounded-lg" />
      ) : null}

      <span className="sr-only">Dashboard wird geladen</span>
    </div>
  );
}