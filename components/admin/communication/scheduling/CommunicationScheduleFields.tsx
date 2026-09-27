"use client";

type Props = {
  tenantTimezone: string;
  scheduledAtLocal: string;
  onScheduledAtLocalChange: (value: string) => void;
  scheduleEnabled: boolean;
  onScheduleEnabledChange: (enabled: boolean) => void;
};

export default function CommunicationScheduleFields({
  tenantTimezone,
  scheduledAtLocal,
  onScheduledAtLocalChange,
  scheduleEnabled,
  onScheduleEnabledChange,
}: Props) {
  return (
    <fieldset className="space-y-3 rounded-xl border border-[var(--border)] p-4">
      <legend className="px-1 text-sm font-medium">Veröffentlichung</legend>
      <label className="flex items-center gap-2 text-sm">
        <input
          type="radio"
          checked={!scheduleEnabled}
          onChange={() => onScheduleEnabledChange(false)}
        />
        Jetzt veröffentlichen
      </label>
      <label className="flex items-center gap-2 text-sm">
        <input
          type="radio"
          checked={scheduleEnabled}
          onChange={() => onScheduleEnabledChange(true)}
        />
        Planen
      </label>
      {scheduleEnabled ? (
        <div className="space-y-2">
          <label className="block text-sm">
            <span className="mb-1 block font-medium">Geplant für (Vereinszeit)</span>
            <input
              type="datetime-local"
              className="w-full max-w-xs rounded-lg border border-[var(--border)] bg-[var(--surface-1)] px-3 py-2"
              value={scheduledAtLocal}
              onChange={(e) => onScheduledAtLocalChange(e.target.value)}
            />
          </label>
          <p className="text-xs text-[var(--text-2)]">
            Zeitzone: {tenantTimezone} · Genauigkeit ca. 1 Minute (Cron)
          </p>
        </div>
      ) : null}
    </fieldset>
  );
}
