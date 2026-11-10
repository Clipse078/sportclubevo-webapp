import type { ReactNode } from "react";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { PageBreadcrumbs, type BreadcrumbItem } from "@/components/ui/page";
import { TRAINING_FORM_MAX_WIDTH_CLASS } from "@/components/admin/training/form/training-form-layout";
import { cn } from "@/lib/cn";

type Props = {
  breadcrumbs: BreadcrumbItem[];
  backHref?: string;
  backLabel?: string;
  /** Optional page chrome above the composer; omit when the composer owns the creation title. */
  header?: ReactNode;
  children: ReactNode;
  contextRail?: ReactNode;
  testId?: string;
  hideNavChrome?: boolean;
};

export default function TrainingRecordWorkspaceShell({
  breadcrumbs,
  backHref = "/dashboard/training",
  backLabel = "Trainings",
  header,
  children,
  contextRail,
  testId,
  hideNavChrome = false,
}: Props) {
  const showBreadcrumbs = !hideNavChrome && breadcrumbs.length > 0;
  const showBackLink = !hideNavChrome;
  const showTopChrome = showBreadcrumbs || showBackLink || header != null;

  return (
    <div className={cn(TRAINING_FORM_MAX_WIDTH_CLASS, "space-y-5 pb-8")} data-testid={testId}>
      {showTopChrome ? (
        <div className="space-y-3 border-b border-[var(--border)]/80 pb-4">
          {showBreadcrumbs ? <PageBreadcrumbs items={breadcrumbs} /> : null}
          {showBackLink ? (
            <Link
              href={backHref}
              className="inline-flex items-center gap-1 text-xs font-medium text-[var(--text-2)] transition hover:text-[var(--foreground)]"
              data-testid="training-record-back-link"
            >
              <ChevronRight className="h-3.5 w-3.5 rotate-180" aria-hidden />
              {backLabel}
            </Link>
          ) : null}
          {header ?? null}
        </div>
      ) : null}

      <div className={cn(contextRail ? "grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(14rem,22rem)] xl:grid-cols-[minmax(0,1fr)_minmax(16rem,24rem)]" : undefined)}>
        <div className="min-w-0">{children}</div>
        {contextRail ? <aside className="min-w-0 space-y-4 lg:sticky lg:top-4 lg:self-start">{contextRail}</aside> : null}
      </div>
    </div>
  );
}
