"use client";

import { useRef, type KeyboardEvent, type ReactNode } from "react";
import { useSceModalDialog } from "@/lib/ui/use-sce-modal-dialog";
import { X } from "lucide-react";
import { cn } from "@/lib/cn";
import { SceModalOverlay } from "@/components/ui/SceModalOverlay";
import {
  SCE_DIALOG_BODY,
  SCE_DIALOG_FOOTER,
  SCE_DIALOG_HEADER,
} from "@/lib/shell/responsive-layout";

export type SheetProps = {
  /** Controls visibility. */
  open: boolean;
  /** Called when the sheet requests to be closed (Escape, backdrop click, X button). */
  onClose: () => void;
  /** Sheet heading. */
  title: string;
  /** Optional supporting text rendered below the title. */
  description?: string;
  /** Sheet body content — scrolls independently. */
  children?: ReactNode;
  /** Optional footer slot — typically holds action buttons. Sticky at bottom. */
  footer?: ReactNode;
};

/**
 * Sheet — right-side planning workspace overlay (canonical SCE modal family).
 */
export function Sheet({ open, onClose, title, description, children, footer }: SheetProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);

  useSceModalDialog({
    open,
    onClose,
    panelRef,
    initialFocusRef: titleRef,
  });

  function handlePanelKeyDown(e: KeyboardEvent<HTMLDivElement>) {
    if (e.key === "Escape") e.stopPropagation();
  }

  return (
    <SceModalOverlay
      open={open}
      onBackdropClick={onClose}
      initialFocusRef={titleRef}
      testId="sce-sheet-overlay"
      contentViewportClassName="!items-stretch !justify-end !p-0"
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="sce-sheet-title"
        aria-describedby={description ? "sce-sheet-desc" : undefined}
        tabIndex={-1}
        onKeyDown={handlePanelKeyDown}
        className={cn(
          "relative z-10 flex h-full max-h-[var(--sce-dialog-max-height)] min-h-0 flex-col",
          "w-full sm:w-[750px] lg:w-[820px]",
          "border-l border-[var(--border)] bg-[var(--surface)] shadow-[var(--shadow-xl)] outline-none",
        )}
      >
        <div className={SCE_DIALOG_HEADER}>
          <div className="min-w-0 flex-1">
            <h2
              ref={titleRef}
              id="sce-sheet-title"
              tabIndex={-1}
              className="text-base font-semibold text-[var(--foreground)] outline-none"
            >
              {title}
            </h2>
            {description && (
              <p id="sce-sheet-desc" className="mt-1 text-sm text-[var(--text-2)]">
                {description}
              </p>
            )}
          </div>

          <button
            type="button"
            aria-label="Schließen"
            onClick={onClose}
            className={cn(
              "shrink-0 rounded-lg p-1.5",
              "text-[var(--text-2)] hover:bg-[var(--surface-2)] hover:text-[var(--foreground)]",
              "transition-colors duration-[120ms]",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--sce-primary)]",
            )}
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>

        {children !== undefined && <div className={SCE_DIALOG_BODY}>{children}</div>}

        {footer && <div className={SCE_DIALOG_FOOTER}>{footer}</div>}
      </div>
    </SceModalOverlay>
  );
}
