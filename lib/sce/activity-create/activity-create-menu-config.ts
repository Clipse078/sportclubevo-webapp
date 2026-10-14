import type { SceActivityCreatePermissions } from "./activity-create-permissions";

export type SceActivityCreateMenuActivityKey = keyof SceActivityCreatePermissions;

export type SceActivityCreateMenuEntry = {
  key: SceActivityCreateMenuActivityKey;
  label: string;
  href: string;
  overlayKey?: "training" | "match" | "tournament" | "veranstaltung";
  activityKind: "TRAINING" | "MATCH" | "TOURNAMENT" | "CLUB_EVENT";
  /** Semantic accent token — icon tint only, not full-row fill. */
  accentToken:
    | "training-blue"
    | "match-red"
    | "tournament-orange"
    | "club-event-violet";
  sceIconName: "training" | "match" | "tournament" | "event";
};

export const SCE_ACTIVITY_CREATE_MENU_ENTRIES: SceActivityCreateMenuEntry[] = [
  {
    key: "training",
    label: "Training",
    href: "/dashboard/training/new",
    overlayKey: "training",
    activityKind: "TRAINING",
    accentToken: "training-blue",
    sceIconName: "training",
  },
  {
    key: "match",
    label: "Spiel",
    href: "/dashboard/matchcenter/new",
    overlayKey: "match",
    activityKind: "MATCH",
    accentToken: "match-red",
    sceIconName: "match",
  },
  {
    key: "tournament",
    label: "Turnier",
    href: "/dashboard/tournamentcenter/new",
    overlayKey: "tournament",
    activityKind: "TOURNAMENT",
    accentToken: "tournament-orange",
    sceIconName: "tournament",
  },
  {
    key: "veranstaltung",
    label: "Veranstaltung",
    href: "/dashboard/veranstaltungen/new",
    overlayKey: "veranstaltung",
    activityKind: "CLUB_EVENT",
    accentToken: "club-event-violet",
    sceIconName: "event",
  },
];

export const SCE_ACTIVITY_CREATE_MENU_PAGE_FALLBACK_LABELS: Record<
  SceActivityCreateMenuActivityKey,
  string
> = {
  training: "Training erstellen (Seite)",
  match: "Spiel erstellen (Seite)",
  tournament: "Turnier erstellen (Seite)",
  veranstaltung: "Veranstaltung erstellen (Seite)",
};
