/**
 * Canonical global activity-create entry point (SCE-ACTIVITY-CREATE-01G).
 * Re-export for surfaces that import a "trigger" rather than the menu directly.
 */
export {
  default,
  type SceActivityCreateMenuProps as SceActivityCreateTriggerProps,
  type SceActivityCreatePermissions,
} from "./SceActivityCreateMenu";
