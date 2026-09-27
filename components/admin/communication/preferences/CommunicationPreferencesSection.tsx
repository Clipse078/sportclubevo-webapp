"use client";

import { useState, useTransition } from "react";
import type { CommunicationPreferenceSettingDto } from "@/lib/communication/preferences/communication-preference-service";

type Props = {
  initialPreferences: CommunicationPreferenceSettingDto[];
};

const CATEGORY_SECTIONS: {
  key: "club" | "sponsor";
  title: string;
  description: string;
  categories: string[];
}[] = [
  {
    key: "club",
    title: "Vereinskommunikation",
    description:
      "Operative Vereinsmitteilungen (z. B. Alarme) sind für den Betrieb erforderlich und können nicht abgeschaltet werden.",
    categories: ["CLUB_OPERATIONAL", "CLUB_INFORMATION"],
  },
  {
    key: "sponsor",
    title: "Sponsoren & Partner",
    description:
      "Werbung und Angebote von Sponsoren und Partnern — unabhängig von Zielgruppenmitgliedschaft.",
    categories: ["SPONSOR_COMMERCIAL"],
  },
];

const CATEGORY_LABELS: Record<string, string> = {
  CLUB_OPERATIONAL: "Operativ (Verein)",
  CLUB_INFORMATION: "Informationen & News",
  SPONSOR_COMMERCIAL: "Sponsoren & Partner",
};

const CHANNEL_LABELS: Record<string, string> = {
  IN_APP: "In-App",
  PUSH: "Push",
  EMAIL: "E-Mail",
};

export default function CommunicationPreferencesSection({ initialPreferences }: Props) {
  const [preferences, setPreferences] = useState(initialPreferences);
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);

  function findPref(category: string, channel: string) {
    return preferences.find((p) => p.category === category && p.channel === channel);
  }

  function updatePreference(category: string, channel: string, enabled: boolean) {
    const current = findPref(category, channel);
    if (!current || !current.userConfigurable) return;

    const explicitState: "ENABLED" | "DISABLED" = enabled ? "ENABLED" : "DISABLED";
    const next: CommunicationPreferenceSettingDto = {
      ...current,
      explicitState,
      effectiveState: explicitState,
    };

    setPreferences((rows) =>
      rows.map((row) =>
        row.category === category && row.channel === channel ? { ...row, ...next } : row,
      ),
    );

    startTransition(async () => {
      setMessage(null);
      const res = await fetch("/api/communication/preferences", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ category, channel, explicitState }),
      });
      if (!res.ok) {
        setMessage("Einstellungen konnten nicht gespeichert werden.");
        setPreferences(initialPreferences);
        return;
      }
      const data = (await res.json()) as { preference: CommunicationPreferenceSettingDto };
      setPreferences((rows) =>
        rows.map((row) =>
          row.category === category && row.channel === channel ? data.preference : row,
        ),
      );
      setMessage("Kommunikationseinstellungen gespeichert.");
    });
  }

  return (
    <section className="rounded-lg border border-[var(--border)] bg-[var(--surface-1)] p-5">
      <h2 className="text-base font-semibold text-[var(--foreground)]">
        Kommunikation & Benachrichtigungen
      </h2>
      <p className="mt-1 text-sm text-[var(--muted)]">
        Steuern Sie Kanäle für Vereins- und Sponsorenkommunikation. Zielgruppenmitgliedschaft ist
        keine Einwilligung.
      </p>

      {message ? <p className="mt-3 text-sm text-[var(--text-2)]">{message}</p> : null}

      <div className="mt-6 space-y-8">
        {CATEGORY_SECTIONS.map((section) => (
          <div key={section.key}>
            <h3 className="text-sm font-semibold text-[var(--foreground)]">{section.title}</h3>
            <p className="mt-1 text-xs text-[var(--muted)]">{section.description}</p>

            <div className="mt-4 overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="border-b border-[var(--border)] text-left text-[var(--muted)]">
                    <th className="py-2 pr-4 font-medium">Kategorie</th>
                    <th className="py-2 px-4 font-medium">In-App</th>
                    <th className="py-2 px-4 font-medium">Push</th>
                    <th className="py-2 pl-4 font-medium">E-Mail</th>
                  </tr>
                </thead>
                <tbody>
                  {section.categories.map((category) => (
                    <tr key={category} className="border-b border-[var(--border)]">
                      <td className="py-3 pr-4 align-top text-[var(--foreground)]">
                        {CATEGORY_LABELS[category] ?? category}
                      </td>
                      {(["IN_APP", "PUSH", "EMAIL"] as const).map((channel) => {
                        const pref = findPref(category, channel);
                        if (!pref) {
                          return (
                            <td key={channel} className="py-3 px-4 text-[var(--muted)]">
                              —
                            </td>
                          );
                        }
                        const required = pref.effectiveState === "REQUIRED";
                        const checked =
                          pref.effectiveState === "REQUIRED" ||
                          pref.effectiveState === "ENABLED" ||
                          (pref.effectiveState === "DEFAULT" && pref.userConfigurable);
                        return (
                          <td key={channel} className="py-3 px-4 align-top">
                            {required ? (
                              <span
                                className="text-xs text-[var(--muted)]"
                                title="Für den Vereinsbetrieb erforderlich"
                              >
                                Immer aktiv
                              </span>
                            ) : pref.userConfigurable ? (
                              <label className="inline-flex cursor-pointer items-center gap-2">
                                <input
                                  type="checkbox"
                                  className="h-4 w-4 rounded border-[var(--border)]"
                                  checked={checked}
                                  disabled={pending}
                                  onChange={(e) =>
                                    updatePreference(category, channel, e.target.checked)
                                  }
                                  aria-label={`${CATEGORY_LABELS[category]} ${CHANNEL_LABELS[channel]}`}
                                />
                                <span className="sr-only">{CHANNEL_LABELS[channel]}</span>
                              </label>
                            ) : (
                              <span className="text-xs text-[var(--muted)]">Nicht verfügbar</span>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
