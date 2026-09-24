import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import type { ReactNode } from "react";

type Props = {
  backHref: string;
  backLabel: string;
  title: string;
  scheduleContext?: string;
  actions?: ReactNode;
  testId?: string;
  backLinkTestId?: string;
  titleTestId?: string;
  contextTestId?: string;
};

export default function PlanningEditorHeader({
  backHref,
  backLabel,
  title,
  scheduleContext,
  actions,
  testId = "planning-editor-header",
  backLinkTestId = "planning-editor-back-link",
  titleTestId,
  contextTestId,
}: Props) {
  return (
    <header className="space-y-2 border-b border-[var(--border)] pb-3" data-testid={testId}>
      <Link
        href={backHref}
        className="inline-flex items-center gap-1.5 text-sm font-medium text-[var(--text-2)] transition hover:text-[var(--foreground)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--primary)]"
        data-testid={backLinkTestId}
      >
        <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
        {backLabel}
      </Link>

      <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2">
        <div className="min-w-0 space-y-0.5">
          <h1
            className="text-xl font-semibold tracking-tight text-[var(--foreground)]"
            data-testid={titleTestId}
          >
            {title}
          </h1>
          {scheduleContext ? (
            <p className="text-sm text-[var(--text-2)]" data-testid={contextTestId}>
              {scheduleContext}
            </p>
          ) : null}
        </div>
        {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
      </div>
    </header>
  );
}
