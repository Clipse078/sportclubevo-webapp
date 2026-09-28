"use client";

import { useCallback, useMemo, useState } from "react";
import type { CommunicationContextRef } from "@/lib/communication/platform/communication-context";
import { buildPersonalisationToken } from "@/lib/communication/personalisation/build-personalisation-token";
import type { PersonalisationMissingPolicyMode } from "@/lib/communication/personalisation/types";

type FieldDto = {
  key: string;
  label: string;
  category: string;
  description: string;
  availability: string;
  implemented: boolean;
  allowedMissingPolicies: string[];
  defaultMissingPolicy: string;
};

const CATEGORY_LABELS: Record<string, string> = {
  RECIPIENT: "Empfänger",
  PLAYER_PARENT: "Spieler & Eltern",
  TEAM: "Team",
  ORGANISATION: "Verein & Organisation",
  SEASON: "Saison",
  EVENT: "Event",
  LOCATION: "Ort & Anlage",
  TRAINING: "Training",
  MATCH: "Spiel",
  TOURNAMENT: "Turnier",
  PARTICIPATION: "Teilnahme",
  SENDER: "Absender",
  DATE: "Datum",
  LINKS: "Links",
};

const POLICY_LABELS: Record<PersonalisationMissingPolicyMode, string> = {
  BLANK: "Leer lassen",
  REPLACEMENT: "Ersatztext",
  BLOCK_SEND: "Versand blockieren",
};

const AVAILABILITY_HINT: Record<string, string> = {
  CONTEXT_REQUIRED: "Kontext erforderlich — Feld kann gespeichert werden, Werte lösen sich erst mit passendem Kontext auf.",
  UNAVAILABLE: "Derzeit nicht verfügbar",
};

type Props = {
  contextRef: CommunicationContextRef;
  onInsert: (token: string) => void;
  disabled?: boolean;
};

function parsePolicy(raw: string): PersonalisationMissingPolicyMode {
  if (raw === "REPLACEMENT" || raw === "BLOCK_SEND") return raw;
  return "BLANK";
}

export function PersonalisationFieldInsert({ contextRef, onInsert, disabled }: Props) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [fields, setFields] = useState<FieldDto[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pendingField, setPendingField] = useState<FieldDto | null>(null);
  const [missingPolicy, setMissingPolicy] = useState<PersonalisationMissingPolicyMode>("BLANK");
  const [fallbackText, setFallbackText] = useState("");

  const loadFields = useCallback(async () => {
    setLoading(true);
    setError(null);
    const params = new URLSearchParams();
    params.set("contextKind", contextRef.kind);
    if (contextRef.kind === "TEAM") params.set("teamId", contextRef.teamId);
    if (contextRef.kind === "ORG_UNIT") params.set("orgUnitId", contextRef.orgUnitId);
    if (contextRef.kind === "EVENT") params.set("eventId", contextRef.eventId);

    try {
      const res = await fetch(`/api/communication/personalisation/fields?${params.toString()}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Felder konnten nicht geladen werden.");
      setFields(data.fields ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Fehler");
    } finally {
      setLoading(false);
    }
  }, [contextRef]);

  function closePanel() {
    setOpen(false);
    setPendingField(null);
    setQuery("");
    setFallbackText("");
  }

  function toggleOpen() {
    if (open) {
      closePanel();
      return;
    }
    setOpen(true);
    void loadFields();
  }

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return fields.filter((f) => {
      if (!q) return true;
      return (
        f.label.toLowerCase().includes(q) ||
        f.key.toLowerCase().includes(q) ||
        f.description.toLowerCase().includes(q)
      );
    });
  }, [fields, query]);

  const grouped = useMemo(() => {
    const map = new Map<string, FieldDto[]>();
    for (const field of filtered) {
      const list = map.get(field.category) ?? [];
      list.push(field);
      map.set(field.category, list);
    }
    return map;
  }, [filtered]);

  const allowedPolicies = useMemo(() => {
    if (!pendingField) return [] as PersonalisationMissingPolicyMode[];
    return pendingField.allowedMissingPolicies.map(parsePolicy);
  }, [pendingField]);

  function selectField(field: FieldDto) {
    if (!field.implemented || field.availability === "UNAVAILABLE") return;
    const defaultPolicy = parsePolicy(field.defaultMissingPolicy);
    setPendingField(field);
    setMissingPolicy(defaultPolicy);
    setFallbackText("");
  }

  function confirmInsert() {
    if (!pendingField) return;
    if (missingPolicy === "REPLACEMENT" && !fallbackText.trim()) return;
    const token = buildPersonalisationToken({
      key: pendingField.key,
      missingPolicy,
      fallbackText: fallbackText.trim(),
      defaultMissingPolicy: parsePolicy(pendingField.defaultMissingPolicy),
    });
    onInsert(token);
    closePanel();
  }

  return (
    <div className="relative inline-block">
      <button
        type="button"
        disabled={disabled}
        onClick={toggleOpen}
        className="rounded-lg border border-[var(--border)] px-3 py-1.5 text-sm font-medium"
      >
        Feld einfügen
      </button>
      {open ? (
        <div className="absolute right-0 z-20 mt-2 w-[min(420px,90vw)] rounded-lg border border-[var(--border)] bg-[var(--background)] p-3 shadow-lg">
          {pendingField ? (
            <div className="space-y-3 text-sm">
              <p className="font-semibold">{pendingField.label}</p>
              <p className="text-xs text-[var(--muted-foreground)]">{pendingField.description}</p>
              {pendingField.availability === "CONTEXT_REQUIRED" ? (
                <p className="text-xs text-amber-700">{AVAILABILITY_HINT.CONTEXT_REQUIRED}</p>
              ) : null}
              <fieldset className="space-y-2">
                <legend className="font-medium">Fehlender Wert</legend>
                {allowedPolicies.map((policy) => (
                  <label key={policy} className="flex items-center gap-2">
                    <input
                      type="radio"
                      name="personalisation-missing-policy"
                      checked={missingPolicy === policy}
                      onChange={() => setMissingPolicy(policy)}
                    />
                    {POLICY_LABELS[policy]}
                  </label>
                ))}
              </fieldset>
              {missingPolicy === "REPLACEMENT" ? (
                <label className="block">
                  <span className="mb-1 block text-xs font-medium">Ersatztext</span>
                  <input
                    className="w-full rounded-md border border-[var(--border)] px-2 py-1.5"
                    value={fallbackText}
                    onChange={(e) => setFallbackText(e.target.value.replace(/"/g, ""))}
                    placeholder="z. B. Mitglied"
                  />
                </label>
              ) : null}
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  className="rounded-md border border-[var(--border)] px-3 py-1"
                  onClick={() => setPendingField(null)}
                >
                  Zurück
                </button>
                <button
                  type="button"
                  className="rounded-md bg-[var(--sce-primary)] px-3 py-1 text-white"
                  disabled={missingPolicy === "REPLACEMENT" && !fallbackText.trim()}
                  onClick={confirmInsert}
                >
                  Einfügen
                </button>
              </div>
            </div>
          ) : (
            <>
              <input
                className="mb-2 w-full rounded-md border border-[var(--border)] px-2 py-1.5 text-sm"
                placeholder="Suchen… z.B. Vorname"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                autoFocus
              />
              {loading ? <p className="text-sm text-[var(--muted-foreground)]">Lade Felder…</p> : null}
              {error ? <p className="text-sm text-red-600">{error}</p> : null}
              <div className="max-h-64 overflow-y-auto text-sm">
                {[...grouped.entries()].map(([category, items]) => (
                  <div key={category} className="mb-3">
                    <p className="mb-1 font-semibold text-[var(--foreground)]">
                      {CATEGORY_LABELS[category] ?? category}
                    </p>
                    <ul className="space-y-1">
                      {items.map((field) => {
                        const disabledField =
                          !field.implemented || field.availability === "UNAVAILABLE";
                        const hint =
                          field.availability !== "AVAILABLE"
                            ? AVAILABILITY_HINT[field.availability] ?? field.availability
                            : field.description;
                        return (
                          <li key={field.key}>
                            <button
                              type="button"
                              disabled={disabledField}
                              className="w-full rounded px-2 py-1 text-left hover:bg-[var(--muted)] disabled:opacity-50"
                              title={hint}
                              onClick={() => selectField(field)}
                            >
                              <span className="font-medium">{field.label}</span>
                              <span className="ml-2 font-mono text-xs text-[var(--muted-foreground)]">
                                &lt;{field.key}&gt;
                              </span>
                              {field.availability === "CONTEXT_REQUIRED" ? (
                                <span className="ml-2 text-xs text-amber-700">Kontext nötig</span>
                              ) : null}
                            </button>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      ) : null}
    </div>
  );
}
