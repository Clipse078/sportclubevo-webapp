/** Shared dark SCE composer form surface tokens (modal-first create). */

export function sceFormSurfaceClasses(layout: "page" | "composer") {
  const isComposer = layout === "composer";
  return {
    isComposer,
    fieldClass: isComposer ? "fca-input w-full" : "fca-input w-full",
    labelClass: isComposer
      ? "mb-1 block text-xs font-medium text-[var(--muted)]"
      : "mb-1 block text-xs font-medium text-[var(--muted)]",
    sectionClass: isComposer
      ? "space-y-4 rounded-xl border border-[var(--border)] bg-[var(--surface-2)]/60 p-4"
      : "space-y-4 rounded-[var(--sce-radius-panel)] border border-[var(--sce-color-border-standard)] bg-[var(--sce-color-surface-standard)] p-4 md:p-5",
    sectionTitleClass: isComposer
      ? "text-sm font-semibold text-[var(--text-1)]"
      : "text-sm font-semibold text-[var(--foreground)]",
    errorClass: isComposer
      ? "rounded-lg border border-rose-500/40 bg-rose-500/10 px-4 py-3 text-sm text-rose-200"
      : "rounded-lg border border-rose-500/40 bg-rose-500/10 px-4 py-3 text-sm text-rose-200",
    cancelButtonClass: isComposer ? "fca-button-secondary" : "fca-button-secondary",
    submitButtonClass: isComposer
      ? "fca-button-primary inline-flex items-center gap-2"
      : "fca-button-primary inline-flex items-center gap-2",
  };
}
