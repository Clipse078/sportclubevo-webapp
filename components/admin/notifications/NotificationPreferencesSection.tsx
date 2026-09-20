"use client";

import { useState, useTransition } from "react";
import type { NotificationPreferenceDto } from "@/lib/notifications/preference-service";

const TYPE_LABELS: Record<string, string> = {
  TASK_ASSIGNED: "Neue Aufgabe",
  SUBTASK_ASSIGNED: "Neue Unteraufgabe",
  TASK_DUE_SOON: "Aufgabe bald fällig",
  TASK_OVERDUE: "Aufgabe überfällig",
  TASK_DEADLINE_CHANGED: "Frist geändert",
  TASK_REMINDER: "Aufgaben-Erinnerung",
  PARTICIPATION_REMINDER: "Teilnahme-Erinnerung",
  PARTICIPATION_OVERDUE: "Teilnahme-Antwort ausstehend",
};

type Props = {
  initialPreferences: NotificationPreferenceDto[];
};

export default function NotificationPreferencesSection({ initialPreferences }: Props) {
  const [preferences, setPreferences] = useState(initialPreferences);
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);

  function updatePreference(
    notificationType: string,
    patch: Partial<Pick<NotificationPreferenceDto, "inAppEnabled" | "emailEnabled">>,
  ) {
    const current = preferences.find((p) => p.notificationType === notificationType);
    if (!current) return;

    const next = {
      ...current,
      ...patch,
    };

    setPreferences((rows) =>
      rows.map((row) => (row.notificationType === notificationType ? next : row)),
    );

    startTransition(async () => {
      setMessage(null);
      const res = await fetch("/api/notifications/preferences", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(next),
      });
      if (!res.ok) {
        setMessage("Einstellungen konnten nicht gespeichert werden.");
        setPreferences(initialPreferences);
        return;
      }
      setMessage("Benachrichtigungseinstellungen gespeichert.");
    });
  }

  return (
    <section className="rounded-lg border border-[var(--border)] bg-[var(--surface-1)] p-5">
      <h2 className="text-base font-semibold text-[var(--foreground)]">Benachrichtigungen</h2>
      <p className="mt-1 text-sm text-[var(--muted)]">
        Steuern Sie, welche Aufgaben-Ereignisse in der App und per E-Mail zugestellt werden.
      </p>

      {message ? <p className="mt-3 text-sm text-[var(--text-2)]">{message}</p> : null}

      <div className="mt-4 overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="border-b border-[var(--border)] text-left text-[var(--muted)]">
              <th className="py-2 pr-4 font-medium">Ereignis</th>
              <th className="py-2 px-4 font-medium">In-App</th>
              <th className="py-2 pl-4 font-medium">E-Mail</th>
            </tr>
          </thead>
          <tbody>
            {preferences.map((row) => (
              <tr key={row.notificationType} className="border-b border-[var(--border)] last:border-0">
                <td className="py-3 pr-4 font-medium text-[var(--foreground)]">
                  {TYPE_LABELS[row.notificationType] ?? row.notificationType}
                </td>
                <td className="py-3 px-4">
                  <label className="inline-flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={row.inAppEnabled}
                      disabled={pending}
                      onChange={(event) =>
                        updatePreference(row.notificationType, {
                          inAppEnabled: event.target.checked,
                        })
                      }
                    />
                    <span className="sr-only">In-App für {TYPE_LABELS[row.notificationType]}</span>
                  </label>
                </td>
                <td className="py-3 pl-4">
                  <label className="inline-flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={row.emailEnabled}
                      disabled={pending}
                      onChange={(event) =>
                        updatePreference(row.notificationType, {
                          emailEnabled: event.target.checked,
                        })
                      }
                    />
                    <span className="sr-only">E-Mail für {TYPE_LABELS[row.notificationType]}</span>
                  </label>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
