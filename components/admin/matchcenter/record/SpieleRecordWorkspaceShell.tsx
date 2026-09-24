import type { ReactNode } from "react";
import { type BreadcrumbItem } from "@/components/ui/page";
import PlanningEditorRecordShell from "@/components/admin/shared/planning-editor/PlanningEditorRecordShell";

type Props = {
  breadcrumbs: BreadcrumbItem[];
  backHref?: string;
  backLabel?: string;
  header: ReactNode;
  children: ReactNode;
  contextRail?: ReactNode;
  testId?: string;
};

export default function SpieleRecordWorkspaceShell({
  breadcrumbs,
  backHref = "/dashboard/matchcenter",
  backLabel = "Spiele",
  header,
  children,
  contextRail,
  testId,
}: Props) {
  return (
    <PlanningEditorRecordShell
      breadcrumbs={breadcrumbs}
      backHref={backHref}
      backLabel={backLabel}
      header={header}
      contextRail={contextRail}
      testId={testId}
      backLinkTestId="spiele-record-back-link"
    >
      {children}
    </PlanningEditorRecordShell>
  );
}
