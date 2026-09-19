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
  SCE_DIALOG_PANEL_BASE,
  SCE_DIALOG_SIZE_LG,
  SCE_DIALOG_SIZE_MD,
  SCE_DIALOG_VARIANT_COMPACT,
  SCE_DIALOG_VARIANT_FORM,
  SCE_DIALOG_VARIANT_WORKSPACE,
} from "@/lib/shell/responsive-layout";

export type DialogSize = "sm" | "md" | "lg" | "xl" | "workspace";

export type DialogProps = {
  /** Controls visibility. */
  open: boolean;
  /** Called when the dialog requests to be closed (Escape, backdrop click, X button). */
  onClose: () => void;
  /** Dialog heading. */
  title: string;
  /** Optional supporting text rendered below the title. */
  description?: string;
  /** Dialog body content. */
  children?: ReactNode;
  /** Optional footer slot — typically holds action buttons. */
  footer?: ReactNode;
  /** Maximum width preset. @default "md" */
  size?: DialogSize;
};

const sizeClass: Record<DialogSize, string> = {
  sm: SCE_DIALOG_VARIANT_COMPACT,
  md: SCE_DIALOG_SIZE_MD,
  lg: SCE_DIALOG_SIZE_LG,
  xl: SCE_DIALOG_VARIANT_FORM,
  workspace: SCE_DIALOG_VARIANT_WORKSPACE,
};

/**
 * Dialog
 *
 * Minimal accessible modal dialog primitive.
 * No external dependency — built on native <dialog> semantics.
 *
 * - Traps focus within the dialog while open.
 * - Closes on Escape key or backdrop click.
 * - Renders into the current React tree; wrap in a portal if needed.
 *
 * Usage:
 *   <Dialog
 *     open={isOpen}
 *     onClose={() => setOpen(false)}
 *     title="Eintrag löschen"
 *     description="Diese Aktion kann nicht rückgängig gemacht werden."
 *     footer={
 *       <>
 *         <Button variant="secondary" onClick={() => setOpen(false)}>Abbrechen</Button>
 *         <Button variant="danger" onClick={handleDelete}>Löschen</Button>
 *       </>
 *     }
 *   >
 *     <p>Möchtest du diesen Eintrag wirklich löschen?</p>
 *   </Dialog>
 */
export function Dialog({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  size = "md",
}: DialogProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);

  useSceModalDialog({
    open,
    onClose,
    panelRef,
    initialFocusRef: titleRef,
  });

  function handlePanelKeyDown(e: KeyboardEvent<HTMLDivElement>) {
    // Prevent Escape from bubbling — already handled globally above
    if (e.key === "Escape") e.stopPropagation();
  }

  return (
    <SceModalOverlay open={open} onBackdropClick={onClose} initialFocusRef={titleRef}>
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="sce-dialog-title"
        aria-describedby={description ? "sce-dialog-desc" : undefined}
        onKeyDown={handlePanelKeyDown}
        className={cn(SCE_DIALOG_PANEL_BASE, sizeClass[size])}
      >
        {/* Header */}
        <div className={SCE_DIALOG_HEADER}>
          <div className="min-w-0 flex-1">
            <h2
              ref={titleRef}
              id="sce-dialog-title"
              tabIndex={-1}
              className="text-base font-semibold text-[var(--foreground)] outline-none"
            >
              {title}
            </h2>
            {description && (
              <p
                id="sce-dialog-desc"
                className="mt-1 text-sm text-[var(--text-2)]"
              >
                {description}
              </p>
            )}
          </div>

          <button
            type="button"
            aria-label="Dialog schließen"
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

        {/* Body */}
        {children !== undefined && <div className={SCE_DIALOG_BODY}>{children}</div>}

        {/* Footer */}
        {footer && <div className={SCE_DIALOG_FOOTER}>{footer}</div>}
      </div>
    </SceModalOverlay>
  );
}
