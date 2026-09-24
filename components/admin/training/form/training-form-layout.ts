/**
 * Shared layout tokens for TrainingCenter create/edit/allocation surfaces.
 * Canonical source: planning-editor-layout (PLANNING-UX-04).
 */

export {
  PLANNING_EDITOR_MAX_WIDTH_CLASS as TRAINING_FORM_MAX_WIDTH_CLASS,
  PLANNING_EDITOR_SURFACE_CLASS as TRAINING_FORM_WORKSPACE_SURFACE_CLASS,
  PLANNING_EDITOR_STICKY_FOOTER_RESERVE_CLASS as TRAINING_FORM_STICKY_FOOTER_RESERVE_CLASS,
  PLANNING_EDITOR_STICKY_FOOTER_CLASS as TRAINING_FORM_STICKY_FOOTER_CLASS,
  PLANNING_EDITOR_TIME_FIELD_WIDTH_CLASS as TRAINING_FORM_TIME_FIELD_WIDTH_CLASS,
  PLANNING_EDITOR_COMPACT_TIME_INPUT_CLASS as TRAINING_FORM_COMPACT_TIME_INPUT_CLASS,
  PLANNING_EDITOR_DATETIME_GRID_CLASS as TRAINING_SESSION_EDIT_DATETIME_GRID_CLASS,
  PLANNING_EDITOR_DATE_INPUT_CLASS as TRAINING_SESSION_EDIT_DATE_INPUT_CLASS,
} from "@/components/admin/shared/planning-editor/planning-editor-layout";

/** Grid track width for Von/Bis columns in TrainingWeekdayScheduleEditor — 7rem. */
export const TRAINING_WEEKDAY_SCHEDULE_TIME_GRID_TRACK = "7rem";

/** Full sm+ grid template for weekday schedule rows (static string for Tailwind). */
export const TRAINING_WEEKDAY_SCHEDULE_GRID_CLASS =
  "sm:grid-cols-[minmax(0,1.2fr)_7rem_7rem_minmax(4.5rem,0.8fr)]";
