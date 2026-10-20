"use client";

/**
 * components/infoboard/v2/designer/HeaderWidgetPanel.tsx
 *
 * Settings panel for the HEADER widget in the Infoboard Designer.
 *
 * Sections:
 *   Vereinsidentität — club name / logo summary (read-only, from tenant)
 *   Untertitel       — enable toggle + text input
 *   Zeit & Datum     — Uhrzeit / Datum toggles
 *   Wetter           — placeholder (deferred)
 */

import { SwitchThumb } from "@/components/ui/SwitchToggle";
import { SCE_FORM_CONTROL_MICRO_UX_MARKERS } from "@/lib/design-system/sce-form-control-micro-ux";
import type { HeaderWidgetSettings } from "@/lib/infoboard/widget-types";

type HeaderWidgetPanelProps = {
  settings: HeaderWidgetSettings;
  tenantName: string;
  onChange: (settings: HeaderWidgetSettings) => void;
};

export function HeaderWidgetPanel({
  settings,
  tenantName,
  onChange,
}: HeaderWidgetPanelProps) {
  function update(partial: Partial<HeaderWidgetSettings>) {
    onChange({ ...settings, ...partial });
  }

  return (
    <div className="space-y-5">

      {/* ── Vereinsidentität ─────────────────────────────────────────────── */}
      <section aria-labelledby="header-section-identity">
        <p
          id="header-section-identity"
          className="text-[0.7rem] font-semibold uppercase tracking-[0.12em] text-[var(--muted)] mb-2.5"
        >
          Vereinsidentität
        </p>
        <div className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface-3)] px-3 py-2.5">
          <p className="text-[0.82rem] font-semibold text-[var(--foreground)]">{tenantName}</p>
          <p className="mt-0.5 text-[0.72rem] text-[var(--muted)] leading-snug">
            Vereinsname und Logo aus den Mandanteneinstellungen.
          </p>
        </div>
      </section>

      {/* ── Untertitel ───────────────────────────────────────────────────── */}
      <section aria-labelledby="header-section-subtitle">
        <p
          id="header-section-subtitle"
          className="text-[0.7rem] font-semibold uppercase tracking-[0.12em] text-[var(--muted)] mb-2.5"
        >
          Untertitel
        </p>
        <div className="space-y-2.5">
          <Toggle
            id="header-subtitle-toggle"
            label="Untertitel anzeigen"
            checked={settings.subtitleEnabled}
            onChange={(v) => update({ subtitleEnabled: v })}
          />
          {settings.subtitleEnabled && (
            <div>
              <label
                htmlFor="header-subtitle-text"
                className="block text-[0.72rem] text-[var(--muted)] mb-1"
              >
                Text
              </label>
              <input
                id="header-subtitle-text"
                type="text"
                value={settings.subtitleText ?? ""}
                onChange={(e) =>
                  update({ subtitleText: e.target.value || null })
                }
                placeholder="HEUTE AUF DER SPORTANLAGE"
                maxLength={200}
                className="w-full rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-[0.82rem] text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--sce-primary)]"
                aria-describedby="header-subtitle-hint"
              />
              <p id="header-subtitle-hint" className="mt-1 text-[0.68rem] text-[var(--muted)]">
                Leer lassen für Standardtext.
              </p>
            </div>
          )}
        </div>
      </section>

      {/* ── Zeit & Datum ─────────────────────────────────────────────────── */}
      <section aria-labelledby="header-section-time">
        <p
          id="header-section-time"
          className="text-[0.7rem] font-semibold uppercase tracking-[0.12em] text-[var(--muted)] mb-2.5"
        >
          Zeit &amp; Datum
        </p>
        <div className="space-y-2.5">
          <Toggle
            id="header-show-time"
            label="Uhrzeit anzeigen"
            checked={settings.showTime}
            onChange={(v) => update({ showTime: v })}
          />
          <Toggle
            id="header-show-date"
            label="Datum anzeigen"
            checked={settings.showDate}
            onChange={(v) => update({ showDate: v })}
          />
        </div>
      </section>

      {/* ── Wetter ───────────────────────────────────────────────────────── */}
      <section aria-labelledby="header-section-weather">
        <p
          id="header-section-weather"
          className="text-[0.7rem] font-semibold uppercase tracking-[0.12em] text-[var(--muted)] mb-2.5"
        >
          Wetter
        </p>
        <div className="space-y-2.5">
          <Toggle
            id="header-show-weather"
            label="Wetter anzeigen"
            checked={settings.showWeather}
            onChange={(v) => update({ showWeather: v })}
          />
        </div>
      </section>

    </div>
  );
}

// ── Toggle ────────────────────────────────────────────────────────────────────

function Toggle({
  id,
  label,
  checked,
  onChange,
}: {
  id: string;
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div
      className="flex items-center justify-between gap-3"
      {...{ [SCE_FORM_CONTROL_MICRO_UX_MARKERS.BINARY_SETTING_ROW]: "true" }}
    >
      <label
        htmlFor={id}
        className="cursor-pointer text-[0.82rem] text-[var(--foreground)] transition-colors select-none group-hover:text-[var(--sce-primary)]"
      >
        {label}
      </label>
      <SwitchThumb id={id} checked={checked} onChange={onChange} aria-label={label} />
    </div>
  );
}
