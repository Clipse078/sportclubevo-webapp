"use client";

import { useEffect, useMemo, useState } from "react";
import { Dialog } from "@/components/ui/Dialog";
import {
  filterValidReparentTargets,
  type OrgHierarchyUnit,
} from "@/lib/org/org-hierarchy-layout";

type ParentOption = { id: string; name: string; level: number };

type OrgUnitImpact = {
  childOrgUnits: number;
  teamSeasonLinks: number;
  orgUnitMemberships: number;
  personAssignments: number;
  scopedUserRoles: number;
  legacyTeamLinks: number;
};

type Props = {
  open: boolean;
  onClose: () => void;
  orgUnitId: string;
  orgUnitName: string;
  directChildIds: string[];
  hierarchyUnits: Pick<OrgHierarchyUnit, "id" | "parentId">[];
  parentOptions: ParentOption[];
  onDeleted?: () => void;
};

export default function OrgUnitBuilderDeleteDialog({
  open,
  onClose,
  orgUnitId,
  orgUnitName,
  directChildIds,
  hierarchyUnits,
  parentOptions,
  onDeleted,
}: Props) {
  const [loadingImpact, setLoadingImpact] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [impact, setImpact] = useState<OrgUnitImpact | null>(null);
  const [relocateParentId, setRelocateParentId] = useState("");

  const relocateTargets = useMemo(() => {
    const valid = new Set(filterValidReparentTargets(hierarchyUnits, orgUnitId));
    return parentOptions.filter((o) => valid.has(o.id) && o.id !== orgUnitId);
  }, [hierarchyUnits, orgUnitId, parentOptions]);

  useEffect(() => {
    if (!open) return;
    setError(null);
    setImpact(null);
    setRelocateParentId("");
    setLoadingImpact(true);
    void (async () => {
      try {
        const response = await fetch(`/api/org-units/${encodeURIComponent(orgUnitId)}/permanent`, {
          method: "DELETE",
        });
        const data = await response.json().catch(() => null);
        if (!response.ok) throw new Error(data?.error ?? "Vorschau nicht verfügbar.");
        setImpact(data?.impact ?? null);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Ein Fehler ist aufgetreten.");
      } finally {
        setLoadingImpact(false);
      }
    })();
  }, [open, orgUnitId]);

  async function handleConfirmDelete() {
    if (!impact) return;
    if (impact.childOrgUnits > 0 && !relocateParentId) {
      setError("Bitte wählen Sie ein Ziel für die Untereinheiten.");
      return;
    }
    setDeleting(true);
    setError(null);
    try {
      if (impact.childOrgUnits > 0 && relocateParentId) {
        for (const childId of directChildIds) {
          const res = await fetch(`/api/org-units/${childId}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ parentId: relocateParentId }),
          });
          if (!res.ok) {
            const data = await res.json().catch(() => ({}));
            throw new Error(data?.error ?? "Untereinheiten konnten nicht verschoben werden.");
          }
        }
      }
      const response = await fetch(
        `/api/org-units/${encodeURIComponent(orgUnitId)}/permanent?confirm=true`,
        { method: "DELETE" },
      );
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        setError(data?.error ?? "Organisationseinheit konnte nicht gelöscht werden.");
        return;
      }
      onClose();
      onDeleted?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Netzwerkfehler.");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <Dialog
      open={open}
      onClose={() => !deleting && onClose()}
      title={`„${orgUnitName}" löschen?`}
      description="Endgültiges Löschen mit Abhängigkeitsprüfung — Untereinheiten werden nicht stillschweigend mitgelöscht."
      size="md"
      footer={null}
    >
      <div className="space-y-4 text-sm text-[var(--text-2)]" data-testid="org-builder-delete-dialog">
        {loadingImpact ? (
          <p className="text-[var(--muted)]">Auswirkungen werden geprüft…</p>
        ) : impact ? (
          <>
            {impact.childOrgUnits > 0 ? (
              <p>
                Diese Einheit enthält{" "}
                <strong className="text-[var(--text-1)]">
                  {impact.childOrgUnits} Untereinheit{impact.childOrgUnits === 1 ? "" : "en"}
                </strong>
                .
              </p>
            ) : null}
            {impact.childOrgUnits > 0 ? (
              <label className="block space-y-1.5">
                <span className="font-medium text-[var(--text-1)]">Untereinheiten verschieben nach</span>
                <select
                  className="fca-input w-full"
                  value={relocateParentId}
                  onChange={(e) => setRelocateParentId(e.target.value)}
                  data-testid="org-delete-relocate-select"
                >
                  <option value="">— Zieleinheit wählen —</option>
                  {relocateTargets.map((opt) => (
                    <option key={opt.id} value={opt.id}>
                      {"—".repeat(Math.max(0, opt.level))} {opt.name}
                    </option>
                  ))}
                </select>
              </label>
            ) : null}
            {(impact.orgUnitMemberships > 0 ||
              impact.personAssignments > 0 ||
              impact.teamSeasonLinks > 0) && (
              <p className="text-xs text-[var(--muted)]">
                Zugehörige Mitgliedschaften und Zuordnungen an dieser Einheit werden entfernt; Personen,
                Teams und Benutzerkonten bleiben erhalten.
              </p>
            )}
          </>
        ) : null}
        {error ? (
          <p className="text-sm text-rose-400" role="alert">
            {error}
          </p>
        ) : null}
        <div className="flex justify-end gap-2 border-t border-[var(--border)] pt-4">
          <button type="button" className="fca-button-secondary" onClick={onClose} disabled={deleting}>
            Abbrechen
          </button>
          <button
            type="button"
            className="fca-button-primary border border-rose-500/40 bg-rose-600/90 hover:bg-rose-600"
            onClick={() => void handleConfirmDelete()}
            disabled={deleting || loadingImpact || !impact}
            data-testid="org-delete-confirm"
          >
            {deleting ? "Löschen…" : "Endgültig löschen"}
          </button>
        </div>
      </div>
    </Dialog>
  );
}
