/** Shared dark SCE composer form surface tokens (modal-first create). */

export function sceFormSurfaceClasses(layout: "page" | "composer") {
  const isComposer = layout === "composer";
  return {
    isComposer,
    fieldClass: isComposer
      ? "fca-input w-full"
      : "w-full rounded-[14px] border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0b4aa2]/30",
    labelClass: isComposer
      ? "mb-1 block text-xs font-medium text-[var(--muted)]"
      : "block text-[12px] font-semibold uppercase tracking-[0.1em] text-slate-500 mb-1.5",
    sectionClass: isComposer
      ? "space-y-4 rounded-xl border border-[var(--border)] bg-[var(--surface-2)]/60 p-4"
      : "rounded-[28px] border border-slate-200/80 bg-white p-6 shadow-[0_10px_30px_rgba(15,23,42,0.04)]",
    sectionTitleClass: isComposer
      ? "text-sm font-semibold text-[var(--text-1)]"
      : "mb-5 text-[1.05rem] font-semibold text-slate-900",
    errorClass: isComposer
      ? "rounded-lg border border-rose-500/40 bg-rose-500/10 px-4 py-3 text-sm text-rose-200"
      : "rounded-[20px] border border-rose-200 bg-rose-50 px-5 py-4 text-sm font-medium text-rose-700",
    cancelButtonClass: isComposer
      ? "fca-button-secondary"
      : "rounded-full border border-slate-200 bg-white px-5 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-50",
    submitButtonClass: isComposer
      ? "fca-button-primary inline-flex items-center gap-2"
      : "inline-flex items-center gap-2 rounded-full bg-[#0b4aa2] px-6 py-2.5 text-sm font-semibold text-white shadow-sm disabled:opacity-60 hover:bg-[#08357a]",
  };
}
