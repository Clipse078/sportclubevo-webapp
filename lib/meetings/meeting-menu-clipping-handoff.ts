/**
 * PR #1000 delivery ledger — meeting menus, countdown, Sitzungsmodus notes.
 */

export const MEETING_MENU_PULL_REQUEST = 1000 as const;

export const MEETING_MENU_ACCEPTANCE_PATH =
  "/vereinsleitung/meetings/vereinsleitungssitzung-november-2026" as const;

export const STAGE_APP_URL = "https://sportclubevo-webapp-stage.vercel.app" as const;

/** Updated after push — Vercel Ready SHA from GitHub check. */
export const MEETING_MENU_VERIFIED_HEAD_SHA_PLACEHOLDER =
  "pending-push" as const;

/**
 * Menu styling cause (PO):
 * PopoverContent defaults use `bg-[var(--surface)]`; inside Vereinsentwicklung section shells
 * those tokens read dark. Scoped meeting menus force `!bg-white` + navy item tokens via
 * `MEETING_WORKSPACE_MENU_POPOVER_SURFACE_CLASS` on every meeting popover.
 */
export const MEETING_MENU_STYLING_DIAGNOSIS =
  "Portalled popovers inherited dark `--surface` from SCE shell theme; fixed with scoped `!bg-white` meeting-menu classes." as const;

/**
 * Canonical fields:
 * - Protocol text: `MeetingAgendaItem.notes` (edit + append)
 * - Vorhaben context: `Initiative.summary` / `description` via `resolveMeetingAgendaTopicBackground` (read-only)
 */
export const MEETING_AGENDA_NOTES_FIELD = "MeetingAgendaItem.notes" as const;