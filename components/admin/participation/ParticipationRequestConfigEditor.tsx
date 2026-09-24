"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { ParticipationRequestDeadlineFields } from "./ParticipationRequestDeadlineFields";

export type ParticipationRequestConfigValues = {
  participationResponseDueAt: string | null;
  participationReminder1At: string | null;
  participationReminder2At: string | null;
  participationReminder1PresetKey: string | null;
  participationReminder2PresetKey: string | null;
};

type Props = {
  apiPath: string;
  timeZone: string;
  values: ParticipationRequestConfigValues;
  disabled?: boolean;
  /** Flat panel layout for single-session edit (no nested card chrome). */
  layout?: "default" | "sessionEdit";
  onSaved?: () => void;
  onError?: (message: string) => void;
};

function readFormPayload(form: HTMLFormElement): Record<string, unknown> {
  const fd = new FormData(form);
  const body: Record<string, unknown> = {};
  for (const [key, value] of fd.entries()) {
    if (typeof value === "string") body[key] = value;
  }
  if (fd.get("participationResponseDueClear") === "true") {
    body.participationResponseDueClear = true;
  }
  return body;
}

export function ParticipationRequestConfigEditor({
  apiPath,
  timeZone,
  values,
  disabled,
  layout = "default",
  onSaved,
  onError,
}: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function afterSave() {
    if (onSaved) onSaved();
    else router.refresh();
  }

  function submit(form: HTMLFormElement) {
    const body = readFormPayload(form);
    startTransition(async () => {
      const res = await fetch(apiPath, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = (await res.json().catch(() => null)) as { error?: string } | null;
      if (!res.ok) {
        onError?.(data?.error ?? "Speichern fehlgeschlagen.");
        return;
      }
      afterSave();
    });
  }

  return (
    <form
      className="space-y-2"
      data-testid="participation-request-config-editor"
      onChange={(e) => {
        e.preventDefault();
        submit(e.currentTarget);
      }}
      onSubmit={(e) => e.preventDefault()}
    >
      <ParticipationRequestDeadlineFields
        timeZone={timeZone}
        disabled={disabled || pending}
        layout={layout === "sessionEdit" ? "sessionEdit" : "default"}
        participationResponseDueAt={values.participationResponseDueAt}
        reminder1At={values.participationReminder1At}
        reminder2At={values.participationReminder2At}
        reminder1PresetKey={values.participationReminder1PresetKey}
        reminder2PresetKey={values.participationReminder2PresetKey}
      />
      {values.participationResponseDueAt ? (
        <button
          type="button"
          className="text-xs text-[var(--muted)] hover:text-[var(--foreground)]"
          disabled={disabled || pending}
          data-testid="participation-clear-deadline"
          onClick={() => {
            const form = document.querySelector(
              `[data-testid="participation-request-config-editor"]`,
            ) as HTMLFormElement | null;
            if (!form) return;
            startTransition(async () => {
              const res = await fetch(apiPath, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  participationResponseDueClear: true,
                  reminder1Preset: "",
                  reminder2Preset: "",
                }),
              });
              const data = (await res.json().catch(() => null)) as { error?: string } | null;
              if (!res.ok) onError?.(data?.error ?? "Speichern fehlgeschlagen.");
              else afterSave();
            });
          }}
        >
          Antwortfrist entfernen
        </button>
      ) : null}
    </form>
  );
}
