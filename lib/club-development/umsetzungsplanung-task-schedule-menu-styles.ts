/**
 * Portalled Umsetzungsplanung task schedule menu — must scope white edition tokens
 * (`data-sce-theme="white"`) because FloatingPortal mounts on `document.body` outside
 * `.sce-authenticated-app-shell`.
 */
import {
  SCE_OVERFLOW_MENU_ITEM_CLASS,
  SCE_OVERFLOW_MENU_SURFACE_CLASS,
} from "@/lib/design-system/sce-action-dialog-micro-ux";

/** Popover outer surface (combined with `PopoverContent` `surfaceVariant="sce-light"`). */
export const UMSETZUNGSPLANUNG_TASK_SCHEDULE_MENU_POPOVER_CLASS = [
  "max-h-[min(24rem,70vh)] min-w-[14rem] max-w-[min(20rem,90vw)] overflow-y-auto",
  SCE_OVERFLOW_MENU_SURFACE_CLASS,
  "!p-1.5",
].join(" ");

/** Inner token scope — redefines `--surface` / `--foreground` for all descendants. */
export const UMSETZUNGSPLANUNG_TASK_SCHEDULE_MENU_THEME_SCOPE_CLASS =
  "umsetzungsplanung-task-schedule-menu-surface flex flex-col gap-0.5 text-left";

export const UMSETZUNGSPLANUNG_TASK_SCHEDULE_MENU_SECTION_HEADING_CLASS =
  "px-3 pb-1 pt-1.5 text-[0.65rem] font-semibold uppercase tracking-wide text-[var(--muted)]";

export const UMSETZUNGSPLANUNG_TASK_SCHEDULE_MENU_GROUP_HEADING_CLASS =
  "px-3 pb-0.5 pt-1 text-[0.6rem] font-semibold uppercase tracking-wide text-[var(--muted)]";

export const UMSETZUNGSPLANUNG_TASK_SCHEDULE_MENU_PHASE_ITEM_CLASS = [
  SCE_OVERFLOW_MENU_ITEM_CLASS,
  "!min-h-[2rem] py-1.5 pl-5 pr-3 text-xs",
].join(" ");

export const UMSETZUNGSPLANUNG_TASK_SCHEDULE_MENU_ACTION_ITEM_CLASS = [
  SCE_OVERFLOW_MENU_ITEM_CLASS,
  "!min-h-[2rem] py-1.5 text-xs font-medium",
].join(" ");

export const UMSETZUNGSPLANUNG_TASK_SCHEDULE_MENU_EMPTY_CLASS =
  "px-3 py-2 text-xs text-[var(--muted)]";

export const UMSETZUNGSPLANUNG_TASK_SCHEDULE_MENU_DIVIDER_CLASS = "my-1 h-px bg-[var(--border)]";