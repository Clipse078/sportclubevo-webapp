/**
 * Scoped presentation for meeting workspace «Weitere Aktionen» only.
 * Do not reuse for global PopoverContent surfaces.
 */

/** PopoverContent overrides — base panel chrome comes from `PopoverContent` defaults. */
export const MEETING_WORKSPACE_SECONDARY_MENU_POPOVER_CLASS = "min-w-[12rem] p-1.5";

export const MEETING_WORKSPACE_SECONDARY_MENU_PANEL_CLASS = "flex flex-col gap-0.5";

export const MEETING_WORKSPACE_SECONDARY_MENU_ITEM_CLASS =
  "flex w-full items-center rounded-[0.625rem] px-3 py-2 text-left text-sm font-medium text-[var(--foreground)] transition-colors duration-[120ms] hover:bg-[var(--surface-2)] focus-visible:outline-none focus-visible:bg-[var(--surface-2)] focus-visible:ring-2 focus-visible:ring-[var(--sce-primary)] focus-visible:ring-offset-0 disabled:cursor-not-allowed disabled:opacity-50";

export const MEETING_WORKSPACE_SECONDARY_MENU_ITEM_MUTED_CLASS =
  "flex w-full cursor-not-allowed items-center rounded-[0.625rem] px-3 py-2 text-left text-sm text-[var(--muted)]";

export const MEETING_WORKSPACE_SECONDARY_MENU_DIVIDER_CLASS =
  "my-1 border-t border-[var(--border)]";

export const MEETING_WORKSPACE_SECONDARY_MENU_DESTRUCTIVE_ITEM_CLASS =
  "flex w-full items-center gap-2 rounded-[0.625rem] px-3 py-2 text-left text-sm font-medium text-[var(--sce-danger)] transition-colors duration-[120ms] hover:bg-[var(--sce-danger-light)] focus-visible:outline-none focus-visible:bg-[var(--sce-danger-light)] focus-visible:ring-2 focus-visible:ring-[var(--sce-danger)]/35 focus-visible:ring-offset-0 disabled:cursor-not-allowed disabled:opacity-50";