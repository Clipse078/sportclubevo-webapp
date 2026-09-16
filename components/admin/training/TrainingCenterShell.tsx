import type { ReactNode } from "react";
import Link from "next/link";
import { Plus } from "lucide-react";
import { PageHeader, PageActions } from "@/components/ui/page";
import { SceSegmentedLinkGroup } from "@/components/admin/shared/SceSegmentedLinkGroup";
import {
  trainingCenterWorkspaceCn,
  type TrainingCenterWorkspaceWidth,
} from "@/lib/training/training-center-layout";
import { cn } from "@/lib/cn";

export type TrainingCenterTab = "kalender" | "planungsraster" | "serien";

const TOP_TABS: { key: TrainingCenterTab; label: string }[] = [
  { key: "kalender", label: "Kalender" },
  { key: "planungsraster", label: "Planungsraster" },
  { key: "serien", label: "Serien" },
];

type Props = {
  activeTab: TrainingCenterTab;
  workspaceWidth?: TrainingCenterWorkspaceWidth;
  canCreateSeries?: boolean;
  children: ReactNode;
  /** Sub-pages (edit, new) use a slimmer shell without top tabs. */
  variant?: "workspace" | "editor";
  title?: string;
  description?: string;
  headerActions?: ReactNode;
  className?: string;
};

export default function TrainingCenterShell({
  activeTab,
  workspaceWidth = "standard",
  canCreateSeries = false,
  children,
  variant = "workspace",
  title,
  description,
  headerActions,
  className,
}: Props) {
  const isWorkspace = variant === "workspace";
  const pageTitle = title ?? "TrainingCenter";
  const pageDescription =
    description ?? "Kalender, Planungsraster und Serien für alle Trainingsserien.";

  return (
    <div
      data-testid="training-center-shell"
      data-workspace-width={workspaceWidth}
      className={cn(trainingCenterWorkspaceCn(workspaceWidth), "space-y-6 py-2", className)}
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <PageHeader
          eyebrow={isWorkspace ? "Planung" : "TrainingCenter"}
          title={pageTitle}
          description={pageDescription}
          className="mb-0 flex-1"
        />
        <PageActions className="shrink-0 sm:pt-1">
          {headerActions ??
            (canCreateSeries ? (
              <Link
                href="/dashboard/training/new"
                className="fca-button-primary inline-flex items-center gap-1.5 text-sm"
                data-testid="training-center-new-series"
              >
                <Plus className="h-3.5 w-3.5" aria-hidden />
                Neue Trainingsserie
              </Link>
            ) : null)}
        </PageActions>
      </div>

      {isWorkspace ? (
        <SceSegmentedLinkGroup
          aria-label="TrainingCenter-Bereiche"
          testId="trainingcenter-tab"
          value={activeTab}
          options={TOP_TABS.map((tab) => ({
            value: tab.key,
            label: tab.label,
            href: `/dashboard/training?tab=${tab.key}`,
          }))}
        />
      ) : null}

      {children}
    </div>
  );
}
