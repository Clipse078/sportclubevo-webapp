"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { MinutesDurationInput } from "@/components/admin/shared/MinutesDurationInput";
import type { TenantDressingRoomOccupancyPresets } from "@/lib/dressing-room-occupancy/types";
import type { OperationalDurationKind } from "@/lib/operational/defaults";
import type { TenantOperationalDurationPolicyResolved } from "@/lib/operational/tenant-operational-duration-policy-service";

type Props = {
  initialPolicy: TenantOperationalDurationPolicyResolved;
  initialPresets: TenantDressingRoomOccupancyPresets;
  canManage: boolean;
};

const DURATION_ROWS: { kind: OperationalDurationKind; label: string; inputId: string }[] = [
  { kind: "MATCH", label: "Spiele", inputId: "match-default-duration" },
  { kind: "TRAINING", label: "Trainings", inputId: "training-default-duration" },
  { kind: "TOURNAMENT", label: "Turniere", inputId: "tournament-default-duration" },
];

const PRESET_ROWS: { label: string; key: keyof TenantDressingRoomOccupancyPresets }[] = [
  { label: "Training", key: "training" },
  { label: "Spiel", key: "match" },
  { label: "Turnier", key: "tournament" },
];

function durationSourceLabel(isClubConfigured: boolean): string {
  return isClubConfigured ? "Clubstandard" : "Plattform-Standard";
}

export default function FacilitiesOperationalSettingsPanel({
  initialPolicy,
  initialPresets,
  canManage,
}: Props) {
  const router = useRouter();
  const [savedPolicy, setSavedPolicy] = useState(initialPolicy);
  const [savedPresets, setSavedPresets] = useState(initialPresets);
  const [durationDraft, setDurationDraft] = useState({
    MATCH: initialPolicy.MATCH.durationMinutes,
    TRAINING: initialPolicy.TRAINING.durationMinutes,
    TOURNAMENT: initialPolicy.TOURNAMENT.durationMinutes,
  });
  const [presetsDraft, setPresetsDraft] = useState(initialPresets);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const unchanged = useMemo(() => {
    const durationSame =
      durationDraft.MATCH === savedPolicy.MATCH.durationMinutes &&
      durationDraft.TRAINING === savedPolicy.TRAINING.durationMinutes &&
      durationDraft.TOURNAMENT === savedPolicy.TOURNAMENT.durationMinutes;
    const presetsSame = JSON.stringify(presetsDraft) === JSON.stringify(savedPresets);
    return durationSame && presetsSame;
  }, [durationDraft, presetsDraft, savedPolicy, savedPresets]);

  function resetDrafts() {
    setDurationDraft({
      MATCH: savedPolicy.MATCH.durationMinutes,
      TRAINING: savedPolicy.TRAINING.durationMinutes,
      TOURNAMENT: savedPolicy.TOURNAMENT.durationMinutes,
    });
    setPresetsDraft(savedPresets);
    setError(null);
  }

  async function save() {
    if (!canManage) return;
    setSaving(true);
    setError(null);
    try {
      const [durationRes, presetsRes] = await Promise.all([
        fetch("/api/tenant/operational-duration-policy", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            defaultMatchDurationMinutes: durationDraft.MATCH,
            defaultTrainingDurationMinutes: durationDraft.TRAINING,
            defaultTournamentDurationMinutes: durationDraft.TOURNAMENT,
          }),
        }),
        fetch("/api/tenant/dressing-room-occupancy-presets", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            trainingBeforeMinutes: presetsDraft.training.beforeMinutes,
            trainingAfterMinutes: presetsDraft.training.afterMinutes,
            matchBeforeMinutes: presetsDraft.match.beforeMinutes,
            matchAfterMinutes: presetsDraft.match.afterMinutes,
            tournamentBeforeMinutes: presetsDraft.tournament.beforeMinutes,
            tournamentAfterMinutes: presetsDraft.tournament.afterMinutes,
          }),
        }),
      ]);

      const durationData = (await durationRes.json().catch(() => null)) as {
        error?: string;
        policy?: TenantOperationalDurationPolicyResolved;
      };
      const presetsData = (await presetsRes.json().catch(() => null)) as {
        error?: string;
        presets?: TenantDressingRoomOccupancyPresets;
      };

      if (!durationRes.ok) {
        throw new Error(durationData?.error ?? "Zeitstandards konnten nicht gespeichert werden");
      }
      if (!presetsRes.ok) {
        throw new Error(presetsData?.error ?? "Garderoben-Belegungszeiten konnten nicht gespeichert werden");
      }

      const nextPolicy = durationData.policy ?? savedPolicy;
      const nextPresets = presetsData.presets ?? presetsDraft;
      setSavedPolicy(nextPolicy);
      setSavedPresets(nextPresets);
      setDurationDraft({
        MATCH: nextPolicy.MATCH.durationMinutes,
        TRAINING: nextPolicy.TRAINING.durationMinutes,
        TOURNAMENT: nextPolicy.TOURNAMENT.durationMinutes,
      });
      setPresetsDraft(nextPresets);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Speichern fehlgeschlagen");
    } finally {
      setSaving(false);
    }
  }

  return (
    <section
      className="rounded-lg border border-[var(--border)]/70 bg-[var(--surface)] px-4 py-3.5"
      data-testid="facilities-operational-settings"
    >
      <div className="space-y-4">
        <div>
          <h2 className="text-sm font-semibold text-[var(--foreground)]">Zeitstandards</h2>
          <p className="mt-0.5 max-w-2xl text-xs text-[var(--muted)]">
            Legt die effektive Dauer fest, wenn keine gültige Endzeit vorliegt.
          </p>
          <div className="mt-3 space-y-2.5">
            {DURATION_ROWS.map(({ kind, label, inputId }) => (
              <div
                key={kind}
                className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-0.5 sm:grid-cols-[7.5rem_5.5rem_auto]"
              >
                <label className="text-sm text-[var(--foreground)]" htmlFor={inputId}>
                  {label}
                </label>
                <div className="flex items-center gap-1.5 sm:col-start-2">
                  <MinutesDurationInput
                    id={inputId}
                    className="w-[4.5rem] py-1.5"
                    disabled={!canManage}
                    value={durationDraft[kind]}
                    onChange={(value) => setDurationDraft((prev) => ({ ...prev, [kind]: value }))}
                    data-testid={`${kind.toLowerCase()}-default-duration-minutes`}
                  />
                  <span className="shrink-0 text-sm text-[var(--muted)]">Min.</span>
                </div>
                <p className="text-xs text-[var(--muted)] sm:col-start-3">
                  {durationSourceLabel(savedPolicy[kind].isClubConfigured)}
                </p>
              </div>
            ))}
          </div>
        </div>

        <div className="border-t border-[var(--border)]/50 pt-4">
          <h2 className="text-sm font-semibold text-[var(--foreground)]">Garderoben-Belegungszeiten</h2>
          <p className="mt-0.5 max-w-xl text-xs text-[var(--muted)]">
            Puffer vor und nach einer Aktivität, in dem eine Garderobe reserviert bleibt.
          </p>
          <div className="mt-3 overflow-x-auto">
            <table className="w-full max-w-lg text-sm">
              <thead>
                <tr className="text-xs text-[var(--text-2)]">
                  <th className="pb-2 pr-4 text-left font-medium" scope="col" />
                  <th className="pb-2 px-2 text-right font-medium" scope="col">
                    Vorher
                  </th>
                  <th className="pb-2 pl-2 text-right font-medium" scope="col">
                    Nachher
                  </th>
                </tr>
              </thead>
              <tbody>
                {PRESET_ROWS.map(({ label, key }) => (
                  <tr key={key} className="border-t border-[var(--border)]/40">
                    <th
                      className="py-2 pr-4 text-left text-sm font-medium text-[var(--foreground)]"
                      scope="row"
                    >
                      {label}
                    </th>
                    <td className="py-2 px-2">
                      <label className="inline-flex w-full items-center justify-end gap-1.5">
                        <MinutesDurationInput
                          className="w-14 py-1 text-xs"
                          min={0}
                          max={480}
                          disabled={!canManage}
                          aria-label={`${label} Vorher in Minuten`}
                          value={presetsDraft[key].beforeMinutes}
                          onChange={(value) =>
                            setPresetsDraft((current) => ({
                              ...current,
                              [key]: { ...current[key], beforeMinutes: value },
                            }))
                          }
                          data-testid={`dressing-${key}-before-minutes`}
                        />
                        <span className="text-xs text-[var(--muted)]">Min.</span>
                      </label>
                    </td>
                    <td className="py-2 pl-2">
                      <label className="inline-flex w-full items-center justify-end gap-1.5">
                        <MinutesDurationInput
                          className="w-14 py-1 text-xs"
                          min={0}
                          max={480}
                          disabled={!canManage}
                          aria-label={`${label} Nachher in Minuten`}
                          value={presetsDraft[key].afterMinutes}
                          onChange={(value) =>
                            setPresetsDraft((current) => ({
                              ...current,
                              [key]: { ...current[key], afterMinutes: value },
                            }))
                          }
                          data-testid={`dressing-${key}-after-minutes`}
                        />
                        <span className="text-xs text-[var(--muted)]">Min.</span>
                      </label>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {error ? (
        <p className="mt-3 text-xs text-[var(--danger)]" role="alert">
          {error}
        </p>
      ) : null}

      {canManage ? (
        <div className="mt-4 flex flex-wrap justify-end gap-2 border-t border-[var(--border)]/50 pt-3">
          <button
            type="button"
            className="fca-button-secondary h-9 px-4 text-sm disabled:opacity-50"
            disabled={saving || unchanged}
            onClick={resetDrafts}
            data-testid="facilities-operational-settings-cancel"
          >
            Abbrechen
          </button>
          <button
            type="button"
            className="inline-flex h-9 items-center rounded-md bg-[var(--sce-primary)] px-4 text-sm font-semibold text-white disabled:opacity-50"
            disabled={saving || unchanged}
            onClick={() => void save()}
            data-testid="facilities-operational-settings-save"
          >
            {saving ? "Speichern…" : "Änderungen speichern"}
          </button>
        </div>
      ) : null}
    </section>
  );
}
