import type { EventType } from "@prisma/client";

export type PlannerPublicationFieldKey =
  | "websiteVisible"
  | "wochenplanVisible"
  | "infoboardVisible"
  | "homepageVisible"
  | "trainingsplanVisible"
  | "teamPageVisible";

export type PlannerPublicationRowConfig = {
  key: PlannerPublicationFieldKey;
  label: string;
  description: string;
  /** When true, switch is disabled if websiteVisible is false. */
  requiresWebsite?: boolean;
};

/**
 * Publication controls exposed in the planner entry editor, derived from
 * public feed + publication-policy consumers (not every persisted flag).
 */
export function getPlannerPublicationRowsForType(
  type: EventType,
): PlannerPublicationRowConfig[] {
  switch (type) {
    case "MATCH":
      return [
        {
          key: "websiteVisible",
          label: "Website",
          description: "Auf der Vereinswebsite anzeigen",
        },
        {
          key: "wochenplanVisible",
          label: "Wochenplan",
          description: "Im öffentlichen Wochenplan anzeigen",
          requiresWebsite: true,
        },
        {
          key: "infoboardVisible",
          label: "Infoboard",
          description: "Auf den Vereinsbildschirmen anzeigen",
        },
      ];
    case "TRAINING":
      return [
        {
          key: "websiteVisible",
          label: "Website",
          description: "Auf der Vereinswebsite anzeigen",
        },
        {
          key: "trainingsplanVisible",
          label: "Trainingsplan",
          description: "Im öffentlichen Trainingsplan anzeigen",
          requiresWebsite: true,
        },
        {
          key: "wochenplanVisible",
          label: "Wochenplan",
          description: "Im öffentlichen Wochenplan anzeigen",
          requiresWebsite: true,
        },
        {
          key: "infoboardVisible",
          label: "Infoboard",
          description: "Auf den Vereinsbildschirmen anzeigen",
        },
      ];
    case "TOURNAMENT":
      return [
        {
          key: "websiteVisible",
          label: "Website",
          description: "Auf der Vereinswebsite anzeigen",
        },
        {
          key: "homepageVisible",
          label: "Homepage",
          description: "Zusätzlich auf der Startseite anzeigen",
          requiresWebsite: true,
        },
        {
          key: "wochenplanVisible",
          label: "Wochenplan",
          description: "Im öffentlichen Wochenplan anzeigen",
          requiresWebsite: true,
        },
        {
          key: "infoboardVisible",
          label: "Infoboard",
          description: "Auf den Vereinsbildschirmen anzeigen",
        },
      ];
    case "OTHER":
      return [
        {
          key: "websiteVisible",
          label: "Website",
          description: "Auf der Vereinswebsite anzeigen",
        },
        {
          key: "homepageVisible",
          label: "Homepage",
          description: "Zusätzlich auf der Startseite anzeigen",
          requiresWebsite: true,
        },
        {
          key: "wochenplanVisible",
          label: "Wochenplan",
          description: "Im öffentlichen Wochenplan anzeigen",
          requiresWebsite: true,
        },
      ];
    default:
      return [
        {
          key: "websiteVisible",
          label: "Website",
          description: "Auf der Vereinswebsite anzeigen",
        },
        {
          key: "wochenplanVisible",
          label: "Wochenplan",
          description: "Im öffentlichen Wochenplan anzeigen",
          requiresWebsite: true,
        },
      ];
  }
}

export type PlannerPublicationValues = Record<
  PlannerPublicationFieldKey,
  boolean
>;

export function hiddenPublicationFieldKeys(
  type: EventType,
): PlannerPublicationFieldKey[] {
  const visible = new Set(
    getPlannerPublicationRowsForType(type).map((row) => row.key),
  );
  const all: PlannerPublicationFieldKey[] = [
    "websiteVisible",
    "wochenplanVisible",
    "infoboardVisible",
    "homepageVisible",
    "trainingsplanVisible",
    "teamPageVisible",
  ];
  return all.filter((key) => !visible.has(key));
}
