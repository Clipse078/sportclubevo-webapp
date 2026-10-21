"use client";

/**
 * Provider Mapping — canonical SCE dense workspace (DS-10 R1 Batch 01).
 * Presentation only; filter behaviour uses URL search params (server refetch).
 */

import { useRouter, usePathname } from "next/navigation";
import { useCallback, useState } from "react";
import { Edit2, Unlink, X } from "lucide-react";
import AdminStatusPill from "@/components/admin/shared/AdminStatusPill";
import { SceActionLink } from "@/components/sce/actions/SceActionLink";
import { Button } from "@/components/ui/Button";
import { SceSearchField } from "@/components/sce/forms/SceSearchField";
import {
  SceDataTable,
  SceDataTableBody,
  SceDataTableCell,
  SceDataTableHead,
  SceDataTableHeaderCell,
  SceDataTableRow,
  SceDenseList,
  SceDenseListRow,
  SceDenseSurface,
  SceDenseToolbar,
  SceEntityIdentity,
} from "@/components/sce/dense";
import { SCE_DENSE_META_TEXT_CLASS } from "@/lib/design-system/sce-dense-ui-micro-ux";
import type { ProviderMappingDto } from "@/lib/provider-mapping/types";
import { cn } from "@/lib/cn";

type Props = {
  mappings: ProviderMappingDto[];
  canManage: boolean;
  mappedCount: number;
  unmappedCount: number;
  currentProvider?: string;
  currentSearch?: string;
  currentMappingSource?: string;
};

function confidenceTone(level: string | null): "success" | "warning" | "muted" {
  if (level === "HIGH") return "success";
  if (level === "MEDIUM") return "warning";
  return "muted";
}

function confidenceLabel(level: string | null): string {
  if (!level) return "—";
  if (level === "HIGH") return "Hoch";
  if (level === "MEDIUM") return "Mittel";
  if (level === "LOW") return "Niedrig";
  return level;
}

function editHref(m: ProviderMappingDto): string {
  return m.teamSeasonId
    ? `/dashboard/teams/provider-mapping/${m.teamSeasonId}?mappingId=${m.id}`
    : `/dashboard/teams/provider-mapping/mapping/${m.id}`;
}

export default function ProviderMappingWorkspace({
  mappings,
  canManage,
  mappedCount,
  unmappedCount,
  currentProvider,
  currentSearch,
  currentMappingSource,
}: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [confirmRemove, setConfirmRemove] = useState<string | null>(null);

  const updateParam = useCallback(
    (key: string, value: string | undefined) => {
      const sp = new URLSearchParams(typeof window !== "undefined" ? window.location.search : "");
      if (value) {
        sp.set(key, value);
      } else {
        sp.delete(key);
      }
      router.push(`${pathname}?${sp.toString()}`);
    },
    [router, pathname],
  );

  const clearAll = () => {
    router.push(pathname);
  };

  const hasFilters = Boolean(currentProvider || currentSearch || currentMappingSource);
  const total = mappings.length;

  async function handleRemove(mappingId: string) {
    if (confirmRemove !== mappingId) {
      setConfirmRemove(mappingId);
      return;
    }
    setActionLoading(mappingId);
    setConfirmRemove(null);
    try {
      await fetch(`/api/provider-mapping/${mappingId}`, { method: "DELETE" });
      router.refresh();
    } finally {
      setActionLoading(null);
    }
  }

  return (
    <SceDenseSurface
      feedbackSurfaceId="provider-mapping-overview"
      aria-label="Anbieter-Zuordnungen"
      data-testid="provider-mapping-dense-surface"
    >
      <SceDenseToolbar
        footer={
          <p className="text-sm text-[var(--muted)]" role="status" data-testid="provider-mapping-summary">
            <span className="font-semibold tabular-nums text-emerald-400/95">{mappedCount}</span>
            <span className="ml-1">zugeordnet</span>
            <span className="mx-2 text-[var(--border)]" aria-hidden>
              ·
            </span>
            <span className="font-semibold tabular-nums text-[var(--foreground)]">{unmappedCount}</span>
            <span className="ml-1">nicht zugeordnet</span>
            <span className="mx-2 text-[var(--border)]" aria-hidden>
              ·
            </span>
            <span className="font-semibold tabular-nums text-[var(--foreground)]">{total}</span>
            <span className="ml-1">gesamt</span>
          </p>
        }
      >
        <div className="flex flex-col gap-3 lg:flex-row lg:flex-wrap lg:items-center">
          <SceSearchField
            value=""
            defaultValue={currentSearch ?? ""}
            onChange={(next) => updateParam("search", next || undefined)}
            placeholder="Team oder Anbieter-Team suchen…"
            ariaLabel="Team oder Anbieter-Team suchen"
            testId="provider-mapping-search"
            className="min-w-0 flex-1 lg:max-w-sm"
          />

          <select
            value={currentProvider ?? ""}
            onChange={(e) => updateParam("provider", e.target.value || undefined)}
            className="fca-select rounded-md py-2 text-sm"
            aria-label="Anbieter filtern"
            data-testid="provider-mapping-provider-filter"
          >
            <option value="">Alle Anbieter</option>
            <option value="SFV">SFV</option>
          </select>

          <select
            value={currentMappingSource ?? ""}
            onChange={(e) => updateParam("mappingSource", e.target.value || undefined)}
            className="fca-select rounded-md py-2 text-sm"
            aria-label="Quelle filtern"
            data-testid="provider-mapping-source-filter"
          >
            <option value="">Alle Quellen</option>
            <option value="MANUAL">Manuell</option>
            <option value="SYNC">Sync</option>
          </select>

          {hasFilters ? (
            <Button type="button" variant="secondary" size="sm" onClick={clearAll}>
              <X className="h-3.5 w-3.5" aria-hidden />
              Filter zurücksetzen
            </Button>
          ) : null}
        </div>
      </SceDenseToolbar>

      <div className="hidden md:block">
        <SceDataTable aria-label="Anbieter-Zuordnungen" data-testid="provider-mapping-table">
          <SceDataTableHead>
            <tr>
              <SceDataTableHeaderCell>TeamSeason</SceDataTableHeaderCell>
              <SceDataTableHeaderCell>Wettbewerb (Kontext)</SceDataTableHeaderCell>
              <SceDataTableHeaderCell>Anbieter</SceDataTableHeaderCell>
              <SceDataTableHeaderCell>Anbieter-Team</SceDataTableHeaderCell>
              <SceDataTableHeaderCell>Konfidenz</SceDataTableHeaderCell>
              <SceDataTableHeaderCell>Quelle</SceDataTableHeaderCell>
              <SceDataTableHeaderCell>Status</SceDataTableHeaderCell>
              {canManage ? (
                <SceDataTableHeaderCell align="right">
                  <span className="sr-only">Aktionen</span>
                </SceDataTableHeaderCell>
              ) : null}
            </tr>
          </SceDataTableHead>
          <SceDataTableBody>
            {mappings.map((m) => (
              <SceDataTableRow key={m.id} className="group">
                <SceDataTableCell>
                  <SceEntityIdentity
                    primary={m.teamSeasonDisplayName ?? m.teamName}
                    secondary={m.teamName !== (m.teamSeasonDisplayName ?? m.teamName) ? m.teamName : undefined}
                    className="gap-0"
                  />
                </SceDataTableCell>
                <SceDataTableCell className={SCE_DENSE_META_TEXT_CLASS}>
                  {m.mappingCompetitionName ?? "—"}
                </SceDataTableCell>
                <SceDataTableCell>
                  <span className="font-mono text-xs font-medium text-[var(--text-2)]">{m.provider}</span>
                </SceDataTableCell>
                <SceDataTableCell>
                  <SceEntityIdentity
                    primary={m.providerTeamName ?? `ID ${m.externalTeamId}`}
                    secondary={
                      [
                        m.providerLeagueName,
                        `Team-ID: ${m.externalTeamId}`,
                        `Saison-ID: ${m.externalSeasonId}`,
                      ]
                        .filter(Boolean)
                        .join(" · ") || undefined
                    }
                    className="gap-0 text-xs"
                  />
                </SceDataTableCell>
                <SceDataTableCell>
                  {m.confidenceLevel ? (
                    <AdminStatusPill label={confidenceLabel(m.confidenceLevel)} tone={confidenceTone(m.confidenceLevel)} />
                  ) : (
                    <span className={SCE_DENSE_META_TEXT_CLASS}>—</span>
                  )}
                </SceDataTableCell>
                <SceDataTableCell>
                  <AdminStatusPill
                    label={m.mappingSource === "SYNC" ? "Sync" : "Manuell"}
                    tone={m.mappingSource === "SYNC" ? "muted" : "default"}
                  />
                </SceDataTableCell>
                <SceDataTableCell>
                  {!m.teamSeasonId ? (
                    <AdminStatusPill label="Nicht verknüpft" tone="muted" />
                  ) : !m.providerIsActive ? (
                    <AdminStatusPill label="Inaktiv" tone="warning" />
                  ) : (
                    <AdminStatusPill label="Aktiv" tone="success" />
                  )}
                </SceDataTableCell>
                {canManage ? (
                  <SceDataTableCell align="right">
                    <div className="flex items-center justify-end gap-1" data-sce-row-action="true">
                      <SceActionLink
                        href={editHref(m)}
                        variant="link"
                        size="sm"
                        data-sce-action-hierarchy="TERTIARY_TEXT"
                        className="inline-flex h-auto min-h-0 items-center gap-1 px-2 py-1 text-[0.78rem] opacity-70 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100"
                        title="Zuordnung bearbeiten"
                      >
                        <Edit2 className="h-3.5 w-3.5" aria-hidden />
                        Bearbeiten
                      </SceActionLink>
                      {m.teamSeasonId ? (
                        <Button
                          type="button"
                          variant={confirmRemove === m.id ? "danger" : "ghost"}
                          size="sm"
                          disabled={actionLoading === m.id}
                          onClick={() => handleRemove(m.id)}
                          className={cn(
                            "h-auto min-h-0 px-2 py-1 text-[0.78rem]",
                            confirmRemove !== m.id && "text-[var(--sce-color-status-error)] hover:text-[var(--sce-color-status-error)]",
                          )}
                          title="Zuordnung entfernen"
                        >
                          <Unlink className="h-3.5 w-3.5" aria-hidden />
                          {confirmRemove === m.id ? "Bestätigen?" : "Entfernen"}
                        </Button>
                      ) : null}
                    </div>
                  </SceDataTableCell>
                ) : null}
              </SceDataTableRow>
            ))}
          </SceDataTableBody>
        </SceDataTable>
      </div>

      <SceDenseList aria-label="Anbieter-Zuordnungen (Mobile)" className="md:hidden">
        {mappings.map((m) => (
          <SceDenseListRow key={m.id} className="flex flex-col gap-2.5">
            <SceEntityIdentity
              primary={m.teamSeasonDisplayName ?? m.teamName}
              secondary={m.mappingCompetitionName ?? undefined}
            />
            <div className={`flex flex-wrap gap-2 ${SCE_DENSE_META_TEXT_CLASS}`}>
              <span>{m.provider}</span>
              <span>·</span>
              <span>{m.providerTeamName ?? m.externalTeamId}</span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {m.confidenceLevel ? (
                <AdminStatusPill label={confidenceLabel(m.confidenceLevel)} tone={confidenceTone(m.confidenceLevel)} />
              ) : null}
              <AdminStatusPill
                label={m.mappingSource === "SYNC" ? "Sync" : "Manuell"}
                tone={m.mappingSource === "SYNC" ? "muted" : "default"}
              />
              {!m.teamSeasonId ? (
                <AdminStatusPill label="Nicht verknüpft" tone="muted" />
              ) : !m.providerIsActive ? (
                <AdminStatusPill label="Inaktiv" tone="warning" />
              ) : (
                <AdminStatusPill label="Aktiv" tone="success" />
              )}
            </div>
            {canManage ? (
              <div className="flex flex-wrap gap-2" data-sce-row-action="true">
                <SceActionLink href={editHref(m)} variant="secondary" size="sm">
                  Bearbeiten
                </SceActionLink>
                {m.teamSeasonId ? (
                  <Button
                    type="button"
                    variant={confirmRemove === m.id ? "danger" : "ghost"}
                    size="sm"
                    disabled={actionLoading === m.id}
                    onClick={() => handleRemove(m.id)}
                  >
                    {confirmRemove === m.id ? "Bestätigen?" : "Entfernen"}
                  </Button>
                ) : null}
              </div>
            ) : null}
          </SceDenseListRow>
        ))}
      </SceDenseList>
    </SceDenseSurface>
  );
}

/** Exported for regression tests — edit URL contract (STAGE-OPS-02). */
export { editHref as providerMappingEditHref };
