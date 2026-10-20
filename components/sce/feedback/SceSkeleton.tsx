import { cn } from "@/lib/cn";
import { LoadingSkeleton, type LoadingSkeletonVariant } from "@/components/ui/LoadingSkeleton";
import { SCE_SKELETON_BONE_CLASS } from "@/lib/design-system/sce-feedback-status-micro-ux";
import type { SceSkeletonRecipe } from "@/lib/design-system/sce-feedback-status-foundation";

export type SceSkeletonProps = {
  recipe?: SceSkeletonRecipe;
  rows?: number;
  className?: string;
  "data-testid"?: string;
};

function Bone({ className }: { className?: string }) {
  return <div className={cn(SCE_SKELETON_BONE_CLASS, className)} aria-hidden="true" />;
}

function WorkspaceHeaderSkeleton() {
  return (
    <div className="space-y-2" data-sce-skeleton-recipe="workspace-header">
      <Bone className="h-7 w-56" />
      <Bone className="h-3.5 w-80 max-w-full" />
    </div>
  );
}

function ListRowSkeleton({ rows }: { rows: number }) {
  return (
    <div className="space-y-2" data-sce-skeleton-recipe="list-row">
      {Array.from({ length: rows }).map((_, i) => (
        <div
          key={i}
          className="flex items-center gap-3 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-4 py-3"
        >
          <Bone className="h-8 w-8 shrink-0 rounded-full" />
          <div className="min-w-0 flex-1 space-y-1.5">
            <Bone className="h-3 w-32" />
            <Bone className="h-2.5 w-48" />
          </div>
        </div>
      ))}
    </div>
  );
}

function ReadinessPanelSkeleton() {
  return (
    <div
      className="space-y-3 rounded-xl border border-[var(--border)] bg-[var(--surface-1)] p-4 md:p-5"
      data-sce-skeleton-recipe="readiness-panel"
    >
      <div className="flex justify-between gap-3">
        <div className="flex-1 space-y-2">
          <Bone className="h-4 w-40" />
          <Bone className="h-3 w-full max-w-md" />
        </div>
        <Bone className="h-6 w-16 rounded-full" />
      </div>
      <div className="space-y-2 pt-1">
        <Bone className="h-3 w-full" />
        <Bone className="h-3 w-11/12" />
        <Bone className="h-3 w-10/12" />
      </div>
    </div>
  );
}

function TableRowSkeleton({ rows }: { rows: number }) {
  return (
    <div className="overflow-hidden rounded-xl border border-[var(--border)]" data-sce-skeleton-recipe="table-row">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex gap-4 border-b border-[var(--border)] px-4 py-3 last:border-b-0">
          <Bone className="h-3 w-24" />
          <Bone className="h-3 w-32" />
          <Bone className="ml-auto h-3 w-16" />
        </div>
      ))}
    </div>
  );
}

const LEGACY_VARIANT_MAP: Partial<Record<SceSkeletonRecipe, LoadingSkeletonVariant>> = {
  card: "card",
  page: "page",
  list: "list",
  form: "form",
  table: "table",
};

export function SceSkeleton({
  recipe = "card",
  rows = 3,
  className,
  "data-testid": testId,
}: SceSkeletonProps) {
  const legacy = LEGACY_VARIANT_MAP[recipe];
  if (legacy) {
    return (
      <LoadingSkeleton
        variant={legacy}
        rows={rows}
        className={className}
        data-sce-skeleton-recipe={recipe}
        data-testid={testId}
      />
    );
  }

  return (
    <div
      role="status"
      aria-label="Wird geladen…"
      data-sce-skeleton
      data-testid={testId}
      className={className}
    >
      {recipe === "workspace-header" && <WorkspaceHeaderSkeleton />}
      {recipe === "list-row" && <ListRowSkeleton rows={rows} />}
      {recipe === "readiness-panel" && <ReadinessPanelSkeleton />}
      {recipe === "table-row" && <TableRowSkeleton rows={rows} />}
      <span className="sr-only">Wird geladen…</span>
    </div>
  );
}
