export const SCE_APPROVED_HERO_ICON_NAMES = [
  "dashboard",
  "week-planner",
  "training",
  "match",
  "tournament",
] as const;

export type SceApprovedHeroIconName = (typeof SCE_APPROVED_HERO_ICON_NAMES)[number];

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
