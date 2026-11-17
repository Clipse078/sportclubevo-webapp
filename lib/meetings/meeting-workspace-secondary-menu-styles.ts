/**
 * Scoped presentation for portalled meeting workspace menus only.
 * Forces a light surface so menus stay readable over SCE section shells that set dark `--surface`.
 * Do not reuse for global PopoverContent surfaces.
 */

/** PopoverContent overrides — `!` wins over default `PopoverContent` `bg-[var(--surface)]`. */
export const MEETING_WORKSPACE_MENU_POPOVER_SURFACE_CLASS =
  "min-w-[12rem] p-1.5 !rounded-lg !border !border-[var(--border)] !bg-white !text-[#0b1f3b] !shadow-md";

export const MEETING_WORKSPACE_SECONDARY_MENU_POPOVER_CLASS = MEETING_WORKSPACE_MENU_POPOVER_SURFACE_CLASS;

export const MEETING_WORKSPACE_SECONDARY_MENU_PANEL_CLASS =
  "meeting-workspace-menu-surface flex flex-col gap-0.5";

export const MEETING_WORKSPACE_SECONDARY_MENU_ITEM_CLASS =
  "flex w-full items-center rounded-[0.625rem] px-3 py-2 text-left text-sm font-medium text-[#0b1f3b] transition-colors duration-[120ms] hover:bg-slate-50 focus-visible:outline-none focus-visible:bg-slate-50 focus-visible:ring-2 focus-visible:ring-[var(--sce-primary)] focus-visible:ring-offset-0 disabled:cursor-not-allowed disabled:opacity-50";

export const MEETING_WORKSPACE_SECONDARY_MENU_ITEM_MUTED_CLASS =
  "flex w-full cursor-not-allowed items-center rounded-[0.625rem] px-3 py-2 text-left text-sm text-[var(--muted)]";

export const MEETING_WORKSPACE_SECONDARY_MENU_DIVIDER_CLASS =
  "my-1 border-t border-[var(--border)]";

export const MEETING_WORKSPACE_SECONDARY_MENU_DESTRUCTIVE_ITEM_CLASS =
  "flex w-full items-center gap-2 rounded-[0.625rem] px-3 py-2 text-left text-sm font-medium text-[var(--sce-danger)] transition-colors duration-[120ms] hover:bg-[var(--sce-danger-light)] focus-visible:outline-none focus-visible:bg-[var(--sce-danger-light)] focus-visible:ring-2 focus-visible:ring-[var(--sce-danger)]/35 focus-visible:ring-offset-0 disabled:cursor-not-allowed disabled:opacity-50";