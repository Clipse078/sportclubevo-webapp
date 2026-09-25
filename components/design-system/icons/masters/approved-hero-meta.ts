export const SCE_APPROVED_HERO_ICON_NAMES = [
  "dashboard",
  "week-planner",
  "training",
  "match",
  "tournament",
] as const;

export type SceApprovedHeroIconName = (typeof SCE_APPROVED_HERO_ICON_NAMES)[number];

/** Full SCE approved master library (core + sport/competition + organisation/work). */
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
};
