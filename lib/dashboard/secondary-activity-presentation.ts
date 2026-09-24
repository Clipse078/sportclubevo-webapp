import type { PersonalDashboardSecondaryActivity } from "./secondary-activity-facts";
import {
  eventTypeToSecondaryMessageKey,
  registrationTypeToSecondaryMessageKey,
} from "./secondary-activity-facts";

export type SecondaryActivityTranslator = (
  key: string,
  values?: Record<string, string | number | Date>,
) => string;

export function formatSecondaryActivityPresentation(
  entry: PersonalDashboardSecondaryActivity,
  t: SecondaryActivityTranslator,
): { title: string; subtitle: string } {
  switch (entry.kind) {
    case "news":
      return {
        title: entry.title,
        subtitle: entry.authorName
          ? t("newsByAuthor", { author: entry.authorName })
          : t("newsArticle"),
      };
    case "registration":
      return {
        title: t("registrationTitle", {
          firstName: entry.firstName,
          lastName: entry.lastName,
        }),
        subtitle: t(registrationTypeToSecondaryMessageKey(entry.registrationType)),
      };
    case "event":
      return {
        title: t("eventUpdated", { title: entry.title }),
        subtitle: t(eventTypeToSecondaryMessageKey(entry.eventType)),
      };
    case "meeting":
      return {
        title: entry.title,
        subtitle: t("meetingActivity"),
      };
    default: {
      const _exhaustive: never = entry;
      return _exhaustive;
    }
  }
}
