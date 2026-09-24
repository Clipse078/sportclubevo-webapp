import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { formatSecondaryActivityPresentation } from "../secondary-activity-presentation";
import type { PersonalDashboardSecondaryActivity } from "../secondary-activity-facts";

const locales = {
  en: JSON.parse(readFileSync(join(process.cwd(), "messages/en.json"), "utf8")),
  de: JSON.parse(readFileSync(join(process.cwd(), "messages/de.json"), "utf8")),
  fr: JSON.parse(readFileSync(join(process.cwd(), "messages/fr.json"), "utf8")),
  it: JSON.parse(readFileSync(join(process.cwd(), "messages/it.json"), "utf8")),
} as const;

function translatorFor(locale: keyof typeof locales) {
  const messages = locales[locale].PersonalDashboard.secondary as Record<string, string>;
  return (key: string, values?: Record<string, string | number | Date>) => {
    let template = messages[key] ?? key;
    if (values) {
      for (const [name, value] of Object.entries(values)) {
        template = template.replace(`{${name}}`, String(value));
      }
    }
    return template;
  };
}

describe("DASHBOARD-07 — secondary activity i18n presentation", () => {
  it("localizes registration activity in DE/EN/FR/IT", () => {
    const entry: PersonalDashboardSecondaryActivity = {
      key: "reg-1",
      kind: "registration",
      firstName: "Alex",
      lastName: "Muster",
      registrationType: "PROBETRAINING",
      date: new Date("2026-09-01T12:00:00.000Z"),
    };

    expect(
      formatSecondaryActivityPresentation(entry, translatorFor("de")).subtitle,
    ).toBe("Probetraining");
    expect(
      formatSecondaryActivityPresentation(entry, translatorFor("en")).title,
    ).toContain("Alex");
    expect(
      formatSecondaryActivityPresentation(entry, translatorFor("fr")).subtitle,
    ).toContain("essai");
    expect(
      formatSecondaryActivityPresentation(entry, translatorFor("it")).subtitle,
    ).toContain("prova");
  });

  it("localizes event updated lines without server-built German", () => {
    const entry: PersonalDashboardSecondaryActivity = {
      key: "event-1",
      kind: "event",
      title: "Cup Final",
      eventType: "MATCH",
      date: new Date("2026-09-01T12:00:00.000Z"),
    };

    const enPresentation = formatSecondaryActivityPresentation(entry, translatorFor("en"));
    expect(enPresentation.title).toBe("Cup Final updated");
    expect(enPresentation.subtitle).toBe("Match");

    const dePresentation = formatSecondaryActivityPresentation(entry, translatorFor("de"));
    expect(dePresentation.title).toBe("Cup Final aktualisiert");
    expect(dePresentation.subtitle).toBe("Spiel");
  });
});
