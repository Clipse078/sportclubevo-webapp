import type { LucideIcon } from "lucide-react";
import { Globe, Home, LayoutGrid, Monitor, Users } from "lucide-react";

export type PlanningPublicationChannelKey =
  | "websiteVisible"
  | "infoboardVisible"
  | "homepageVisible"
  | "wochenplanVisible"
  | "teamPageVisible";

export type PlanningPublicationChannelConfig = {
  key: PlanningPublicationChannelKey;
  labelKey: string;
  descriptionKey: string;
  Icon: LucideIcon;
  /** When false, switch is forced off if dependency is unmet. */
  dependsOnWebsite?: boolean;
};

export const TOURNAMENT_PUBLICATION_CHANNELS: PlanningPublicationChannelConfig[] = [
  {
    key: "websiteVisible",
    labelKey: "channels.website.label",
    descriptionKey: "channels.website.descriptionTournament",
    Icon: Globe,
  },
  {
    key: "infoboardVisible",
    labelKey: "channels.infoboard.label",
    descriptionKey: "channels.infoboard.descriptionTournament",
    Icon: Monitor,
  },
  {
    key: "homepageVisible",
    labelKey: "channels.homepage.label",
    descriptionKey: "channels.homepage.descriptionTournament",
    Icon: Home,
    dependsOnWebsite: true,
  },
  {
    key: "wochenplanVisible",
    labelKey: "channels.wochenplan.label",
    descriptionKey: "channels.wochenplan.descriptionTournament",
    Icon: LayoutGrid,
  },
  {
    key: "teamPageVisible",
    labelKey: "channels.teamPage.label",
    descriptionKey: "channels.teamPage.descriptionTournament",
    Icon: Users,
    dependsOnWebsite: true,
  },
];

export const MATCH_PUBLICATION_CHANNELS: PlanningPublicationChannelConfig[] = [
  {
    key: "websiteVisible",
    labelKey: "channels.website.label",
    descriptionKey: "channels.website.descriptionMatch",
    Icon: Globe,
  },
  {
    key: "infoboardVisible",
    labelKey: "channels.infoboard.label",
    descriptionKey: "channels.infoboard.descriptionMatch",
    Icon: Monitor,
  },
  {
    key: "homepageVisible",
    labelKey: "channels.homepage.label",
    descriptionKey: "channels.homepage.descriptionMatch",
    Icon: Home,
    dependsOnWebsite: true,
  },
  {
    key: "wochenplanVisible",
    labelKey: "channels.wochenplan.label",
    descriptionKey: "channels.wochenplan.descriptionMatch",
    Icon: LayoutGrid,
  },
  {
    key: "teamPageVisible",
    labelKey: "channels.teamPage.label",
    descriptionKey: "channels.teamPage.descriptionMatch",
    Icon: Users,
    dependsOnWebsite: true,
  },
];

export const VERANSTALTUNG_PUBLICATION_CHANNELS: PlanningPublicationChannelConfig[] = [
  {
    key: "websiteVisible",
    labelKey: "channels.website.label",
    descriptionKey: "channels.website.descriptionEvent",
    Icon: Globe,
  },
  {
    key: "homepageVisible",
    labelKey: "channels.homepage.label",
    descriptionKey: "channels.homepage.descriptionEvent",
    Icon: Home,
    dependsOnWebsite: true,
  },
  {
    key: "wochenplanVisible",
    labelKey: "channels.wochenplan.label",
    descriptionKey: "channels.wochenplan.descriptionEvent",
    Icon: LayoutGrid,
  },
];

export type PlanningPublicationValues = Partial<
  Record<PlanningPublicationChannelKey, boolean>
>;
