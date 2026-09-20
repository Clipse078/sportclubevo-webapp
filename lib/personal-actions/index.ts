export type {
  LoadPersonalActionsArgs,
  PersonalAction,
  PersonalActionCounts,
  PersonalActionContext,
  PersonalActionInlineActions,
  PersonalActionKind,
  PersonalActionSourceType,
  PersonalActionStatus,
  PersonalActionSubject,
} from "./types";

export { PERSONAL_ACTION_ATTENDANCE_HORIZON_DAYS } from "./config";

export {
  buildParticipationPersonalActionId,
  buildTaskPersonalActionId,
} from "./identity";

export {
  comparePersonalActions,
  dedupePersonalActionsById,
  sortPersonalActions,
} from "./ordering";

export {
  loadDashboardPersonalActions,
  loadPersonalActions,
  DASHBOARD_PERSONAL_ACTION_PREVIEW_LIMIT,
} from "./load-personal-actions";

export { countPersonalActions } from "./count-personal-actions";

export {
  loadPersonalActionsModuleCapabilities,
  resolvePersonalActionsModuleCapabilities,
  resolvePersonalParticipationNavCapability,
} from "./access";
export type { PersonalActionsModuleCapabilities } from "./access";

export { requirePersonalActionsModuleAccess } from "./require-module-access";

export {
  PERSONAL_ACTION_INBOX_DEFAULT_LIMIT,
  filterPersonalActionsForInbox,
  mapPersonalActionToListItem,
  mapPersonalActionsToPreviewItems,
} from "./presentation";
export type { PersonalActionListItem, PersonalActionSourceFilter } from "./presentation";

export {
  buildAufgabenBereichHref,
  buildPersonalInboxFilterHref,
  parseAufgabenBereich,
  parsePersonalInboxFilter,
} from "./aufgaben-scope";
export type { AufgabenBereich, PersonalInboxFilterParam } from "./aufgaben-scope";
