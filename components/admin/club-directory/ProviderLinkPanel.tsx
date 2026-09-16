"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Link2, Pencil } from "lucide-react";
import { Badge, Button } from "@/components/ui";

type ClubProviderMapping = {
  id: string;
  provider: string;
  providerClubId: number;
  providerClubName: string | null;
  providerIsActive: boolean;
  lastSyncedAt: string | null;
};

type TeamProviderMapping = {
  id: string;
  provider: string;
  providerTeamId: number;
  providerSeasonId: number;
  providerTeamName: string | null;
  providerIsActive: boolean;
  lastSyncedAt: string | null;
};

type ProviderLinkPanelProps =
  | { resource: "club"; id: string; mappings: ClubProviderMapping[] }
  | { resource: "team"; id: string; mappings: TeamProviderMapping[] };

const labelClass =
  "mb-1 block text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--muted)]";

/**
 * Provider identity linking — read-first with explicit edit mode.
 */
export function ProviderLinkPanel(props: ProviderLinkPanelProps) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [provider, setProvider] = useState("SFV");
  const [providerId, setProviderId] = useState("");
  const [providerName, setProviderName] = useState("");
  const [seasonId, setSeasonId] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const hasMappings = props.mappings.length > 0;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const numericId = Number(providerId);
    if (!Number.isInteger(numericId) || numericId <= 0) {
      setError("Anbieter-ID muss eine positive Zahl sein.");
      return;
    }

    setLoading(true);
    try {
      const endpoint =
        props.resource === "club"
          ? `/api/club-directory/clubs/${props.id}/provider-link`
          : `/api/club-directory/teams/${props.id}/provider-link`;

      const body =
        props.resource === "club"
          ? { provider, providerClubId: numericId, providerClubName: providerName || null }
          : {
              provider,
              providerTeamId: numericId,
              providerTeamName: providerName || null,
              ...(seasonId ? { providerSeasonId: Number(seasonId) } : {}),
            };

      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data?.error ?? "Verknüpfung fehlgeschlagen.");
        return;
      }
      setProviderId("");
      setProviderName("");
      setSeasonId("");
      setEditing(false);
      router.refresh();
    } catch {
      setError("Netzwerkfehler.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-4" data-testid="provider-link-panel">
      {hasMappings ? (
        <ul className="space-y-3">
          {props.mappings.map((mapping) => (
            <li
              key={mapping.id}
              className="rounded-lg border border-[var(--border)] bg-[var(--surface-2)]/60 px-4 py-3"
            >
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="info" size="sm">
                  {mapping.provider}
                </Badge>
                <span className="text-sm font-semibold text-[var(--foreground)]">
                  {"providerClubName" in mapping
                    ? mapping.providerClubName ?? `#${mapping.providerClubId}`
                    : mapping.providerTeamName ?? `#${mapping.providerTeamId}`}
                </span>
              </div>
              <p className="mt-1 text-xs text-[var(--muted)]">
                {"providerClubId" in mapping
                  ? `Anbieter-ID ${mapping.providerClubId}`
                  : `Anbieter-ID ${mapping.providerTeamId} · Saison ${mapping.providerSeasonId}`}
              </p>
              {mapping.lastSyncedAt ? (
                <p className="mt-0.5 text-xs text-[var(--text-2)]">
                  Zuletzt synchronisiert:{" "}
                  {new Date(mapping.lastSyncedAt).toLocaleDateString("de-CH")}
                </p>
              ) : null}
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-[var(--muted)]">
          Noch keine Anbieter-Verknüpfung. Der {props.resource === "club" ? "Verein" : "Team"} kann
          weiterhin ohne Anbieter verwaltet werden.
        </p>
      )}

      {!editing ? (
        <Button
          type="button"
          variant="secondary"
          size="sm"
          iconLeft={<Pencil className="h-3.5 w-3.5" />}
          onClick={() => setEditing(true)}
          data-testid="provider-link-edit-toggle"
        >
          {hasMappings ? "Verknüpfung bearbeiten" : "Verknüpfung hinzufügen"}
        </Button>
      ) : (
        <form
          onSubmit={handleSubmit}
          className="space-y-3 rounded-lg border border-[var(--border)] bg-[var(--surface-2)]/40 p-4"
          data-testid="provider-link-edit-form"
        >
          {error ? <p className="text-xs font-medium text-[var(--sce-danger)]">{error}</p> : null}
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className={labelClass} htmlFor="provider-select">Anbieter</label>
              <select
                id="provider-select"
                value={provider}
                onChange={(e) => setProvider(e.target.value)}
                className="fca-input w-full"
              >
                <option value="SFV">SFV</option>
              </select>
            </div>
            <div>
              <label className={labelClass} htmlFor="provider-id-input">Anbieter-ID *</label>
              <input
                id="provider-id-input"
                type="number"
                min={1}
                value={providerId}
                onChange={(e) => setProviderId(e.target.value)}
                placeholder={props.resource === "club" ? "z.B. 483" : "z.B. 51234"}
                className="fca-input w-full"
                required
              />
            </div>
            <div className={props.resource === "team" ? "" : "sm:col-span-2"}>
              <label className={labelClass} htmlFor="provider-name-input">Anbieter-Name</label>
              <input
                id="provider-name-input"
                type="text"
                value={providerName}
                onChange={(e) => setProviderName(e.target.value)}
                placeholder="Optional"
                className="fca-input w-full"
              />
            </div>
            {props.resource === "team" ? (
              <div>
                <label className={labelClass} htmlFor="provider-season-input">Saison-ID</label>
                <input
                  id="provider-season-input"
                  type="number"
                  value={seasonId}
                  onChange={(e) => setSeasonId(e.target.value)}
                  placeholder="0 = saisonlos"
                  className="fca-input w-full"
                />
              </div>
            ) : null}
          </div>
          <div className="flex flex-wrap gap-2">
            <Button type="submit" variant="primary" size="sm" loading={loading} iconLeft={<Link2 className="h-3.5 w-3.5" />}>
              Verknüpfung speichern
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={loading}
              onClick={() => {
                setEditing(false);
                setError(null);
              }}
            >
              Abbrechen
            </Button>
          </div>
        </form>
      )}
    </div>
  );
}
