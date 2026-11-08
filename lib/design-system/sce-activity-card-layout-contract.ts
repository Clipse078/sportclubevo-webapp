import { cn } from "@/lib/cn";

/** DS2-04 shared layout roles — align with SCE_INFORMATION_HIERARCHY_LAYERS. */
export const SCE_ACTIVITY_CARD_LAYOUT_ROLES = [
  "SURFACE",
  "HEADER",
  "BODY",
  "FOOTER",
  "CATEGORY",
  "STATUS",
  "ACTIONS",
] as const;

export type SceActivityCardLayoutRole = (typeof SCE_ACTIVITY_CARD_LAYOUT_ROLES)[number];

export const SCE_ACTIVITY_CARD_REGION_CLASS = {
  header: "sce-activity-card__header",
  body: "sce-activity-card__body",
  footer: "sce-activity-card__footer",
  meta: "sce-activity-card__meta",
  schedule: "sce-activity-card__schedule",
  location: "sce-activity-card__location",
  status: "sce-activity-card__status",
} as const;

export function sceActivityCardRegionClass(
  region: keyof typeof SCE_ACTIVITY_CARD_REGION_CLASS,
  className?: string,
): string {
  return cn(SCE_ACTIVITY_CARD_REGION_CLASS[region], className);
}
