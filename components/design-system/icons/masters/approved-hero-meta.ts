export const SCE_APPROVED_HERO_ICON_NAMES = [
  "dashboard",
  "week-planner",
  "training",
  "match",
  "tournament",
] as const;

export type SceApprovedHeroIconName = (typeof SCE_APPROVED_HERO_ICON_NAMES)[number];

/** SCE-ICONS-05 — publishing & platform approved masters (Batch 2). */
export const SCE_APPROVED_PLATFORM_MASTER_ICON_NAMES = [
  "attention",
  "audit",
  "billing-invoice",
  "conflict",
  "infoboard",
  "news",
  "notifications",
  "planning",
  "publish",
  "resource-allocation",
  "settings",
  "website",
] as const;

export type SceApprovedPlatformMasterIconName =
  (typeof SCE_APPROVED_PLATFORM_MASTER_ICON_NAMES)[number];

/** SCE-ICONS-06 — people, membership & club operations approved masters (Batch 3). */
export const SCE_APPROVED_PEOPLE_OPERATIONS_MASTER_ICON_NAMES = [
  "absence",
  "assignment",
  "availability",
  "check-in",
  "coach",
  "committee-board",
  "contact",
  "facility",
  "guardian-parent",
  "invitation",
  "member",
  "partner",
  "player",
  "sponsor",
  "team-management",
  "volunteer",
] as const;

export type SceApprovedPeopleOperationsMasterIconName =
  (typeof SCE_APPROVED_PEOPLE_OPERATIONS_MASTER_ICON_NAMES)[number];

export const SCE_APPROVED_MASTER_ICON_NAMES = [
  ...SCE_APPROVED_HERO_ICON_NAMES,
  "team",
  "season",
  "standings",
  "results",
  "attendance",
  "pitch",
  "dressing-room",
  "organisation",
  "org-unit",
  "people",
  "roles-access",
  "club",
  "documents",
  "tasks",
  "requirements",
  "events",
  "communication",
  ...SCE_APPROVED_PLATFORM_MASTER_ICON_NAMES,
  ...SCE_APPROVED_PEOPLE_OPERATIONS_MASTER_ICON_NAMES,
] as const;

export type SceApprovedMasterIconName = (typeof SCE_APPROVED_MASTER_ICON_NAMES)[number];

export const SCE_APPROVED_HERO_VIEWBOX = "0 0 64 64" as const;

const MASTER_DIR = "public/images/icons";

export const SCE_APPROVED_HERO_MASTER_ASSETS: Record<
  SceApprovedHeroIconName,
  `${typeof MASTER_DIR}/${string}.svg`
> = {
  dashboard: `${MASTER_DIR}/dashboard.svg`,
  "week-planner": `${MASTER_DIR}/week-planner.svg`,
  training: `${MASTER_DIR}/training.svg`,
  match: `${MASTER_DIR}/match.svg`,
  tournament: `${MASTER_DIR}/tournament.svg`,
};

export const SCE_APPROVED_MASTER_ASSETS: Record<
  SceApprovedMasterIconName,
  `${typeof MASTER_DIR}/${string}.svg`
> = {
  ...SCE_APPROVED_HERO_MASTER_ASSETS,
  team: `${MASTER_DIR}/team.svg`,
  season: `${MASTER_DIR}/season.svg`,
  standings: `${MASTER_DIR}/standings.svg`,
  results: `${MASTER_DIR}/results.svg`,
  attendance: `${MASTER_DIR}/attendance.svg`,
  pitch: `${MASTER_DIR}/pitch.svg`,
  "dressing-room": `${MASTER_DIR}/dressing-room.svg`,
  organisation: `${MASTER_DIR}/organisation.svg`,
  "org-unit": `${MASTER_DIR}/org-unit.svg`,
  people: `${MASTER_DIR}/people.svg`,
  "roles-access": `${MASTER_DIR}/roles-access.svg`,
  club: `${MASTER_DIR}/club.svg`,
  documents: `${MASTER_DIR}/documents.svg`,
  tasks: `${MASTER_DIR}/tasks.svg`,
  requirements: `${MASTER_DIR}/requirements.svg`,
  events: `${MASTER_DIR}/events.svg`,
  communication: `${MASTER_DIR}/communication.svg`,
  attention: `${MASTER_DIR}/attention.svg`,
  audit: `${MASTER_DIR}/audit.svg`,
  "billing-invoice": `${MASTER_DIR}/billing-invoice.svg`,
  conflict: `${MASTER_DIR}/conflict.svg`,
  infoboard: `${MASTER_DIR}/infoboard.svg`,
  news: `${MASTER_DIR}/news.svg`,
  notifications: `${MASTER_DIR}/notifications.svg`,
  planning: `${MASTER_DIR}/planning.svg`,
  publish: `${MASTER_DIR}/publish.svg`,
  "resource-allocation": `${MASTER_DIR}/resource-allocation.svg`,
  settings: `${MASTER_DIR}/settings.svg`,
  website: `${MASTER_DIR}/website.svg`,
  absence: `${MASTER_DIR}/absence.svg`,
  assignment: `${MASTER_DIR}/assignment.svg`,
  availability: `${MASTER_DIR}/availability.svg`,
  "check-in": `${MASTER_DIR}/check-in.svg`,
  coach: `${MASTER_DIR}/coach.svg`,
  "committee-board": `${MASTER_DIR}/committee-board.svg`,
  contact: `${MASTER_DIR}/contact.svg`,
  facility: `${MASTER_DIR}/facility.svg`,
  "guardian-parent": `${MASTER_DIR}/guardian-parent.svg`,
  invitation: `${MASTER_DIR}/invitation.svg`,
  member: `${MASTER_DIR}/member.svg`,
  partner: `${MASTER_DIR}/partner.svg`,
  player: `${MASTER_DIR}/player.svg`,
  sponsor: `${MASTER_DIR}/sponsor.svg`,
  "team-management": `${MASTER_DIR}/team-management.svg`,
  volunteer: `${MASTER_DIR}/volunteer.svg`,
};
