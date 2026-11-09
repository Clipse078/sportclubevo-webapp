"use client";

import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

export type SceInlineEditorProps = {
  children: ReactNode;
  open: boolean;
  title?: string;
  description?: string;
  footer?: ReactNode;
  onClose?: () => void;
  className?: string;
  testId?: string;
};

/**
 * Inline contextual editor — expands in place (list rows, calendar cells, cards).
 */
export function SceInlineEditor({
  children,
  open,
  title,
  description,
  footer,
  className,
  testId = "sce-inline-editor",
}: SceInlineEditorProps) {
  if (!open) return null;

  return (
    <div
      className={cn(
        "mt-3 space-y-4 rounded-[var(--sce-radius-control)] border border-[var(--sce-color-border-standard)]",
        "bg-[var(--sce-color-surface-standard)] p-4 shadow-sm",
        className,
      )}
      data-sce-inline-editor
      data-testid={testId}
      role="region"
      aria-label={title ?? "Bearbeiten"}
    >
      {title ? (
        <InlineEditorHeader title={title} description={description} />
      ) : null}
      <div className="min-w-0">{children}</div>
      {footer ? (
        <div className="flex flex-wrap items-center justify-end gap-2 border-t border-[var(--border)] pt-3">
          {footer}
        </div>
      ) : null}
    </div>
  );
}

function InlineEditorHeader({ title, description }: { title: string; description?: string }) {
  return (
    <div className="space-y-1">
      <p className="text-sm font-semibold text-[var(--foreground)]">{title}</p>
      {description ? (
        <p className="text-sm text-[var(--text-2)]">{description}</p>
      ) : null}
    </div>
  );
}
