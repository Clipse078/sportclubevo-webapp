import type { UmsetzungsplanungSectionKey } from "@/lib/club-development/sprints/umsetzungsplanung-workspace";

/** Restrained header accents for Umsetzungsplanung phase buckets (SCE tokens; rows stay neutral). */
export const UMSETZUNGSPLANUNG_SECTION_ACCENTS: Record<
  UmsetzungsplanungSectionKey,
  { headerClass: string; badgeClass: string; iconClass: string }
> = {
  ongoing: {
    headerClass: "border-l-4 border-l-[var(--sce-info)]",
    badgeClass:
      "rounded-full border border-sky-200 bg-sky-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-sky-900",
    iconClass: "text-[var(--sce-info)]",
  },
  planned: {
    headerClass: "border-l-4 border-l-amber-500",
    badgeClass:
      "rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-950",
    iconClass: "text-amber-700",
  },
  unplanned: {
    headerClass: "border-l-4 border-l-slate-400",
    badgeClass:
      "rounded-full border border-slate-200 bg-slate-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-800",
    iconClass: "text-slate-600",
  },
  completed: {
    headerClass: "border-l-4 border-l-emerald-600",
    badgeClass:
      "rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-emerald-900",
    iconClass: "text-emerald-700",
  },
};