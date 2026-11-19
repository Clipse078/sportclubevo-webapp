/** Scoped SCE light popover tokens for Meldung assignee + mention pickers. */

export const SCE_MELDUNG_LIGHT_PICKER_POPOVER_CLASS =
  "border-slate-200 bg-white text-slate-900 shadow-[0_8px_24px_rgba(15,23,42,0.12)]";

export const SCE_MELDUNG_LIGHT_PICKER_MUTED_TEXT = "text-slate-600";

export function sceMeldungLightPickerOptionClass(active: boolean): string {
  return active ? "bg-slate-100" : "hover:bg-slate-50";
}