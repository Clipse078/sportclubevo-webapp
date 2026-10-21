"use client";

import { useEffect, useMemo, useState } from "react";
import { Dialog } from "@/components/ui/Dialog";
import {
  filterValidReparentTargets,
  wouldReparentCreateCycle,
  type OrgHierarchyUnit,
} from "@/lib/org/org-hierarchy-layout";
import { useOptionalOrgBuilderHistory } from "@/components/admin/org/OrgUnitBuilderHistoryContext";

type ParentOption = { id: string; name: string; level: number };

type Props = {
  open: boolean;
  onClose: () => void;
  unitId: string;
  unitName: string;
  currentParentId: string | null;
  hierarchyUnits: Pick<OrgHierarchyUnit, "id" | "parentId">[];
  parentOptions: ParentOption[];
  onSuccess?: () => void;
};

export default function OrgUnitReparentDialog({
  open,
  onClose,
  unitId,
  unitName,
  currentParentId,
  hierarchyUnits,
  parentOptions,
  onSuccess,
}: Props) {
  const orgHistory = useOptionalOrgBuilderHistory();
  const validTargetIds = useMemo(
    () => new Set(filterValidReparentTargets(hierarchyUnits, unitId)),
    [hierarchyUnits, unitId],
  );

  const selectableOptions = useMemo(
    () => parentOptions.filter((o) => validTargetIds.has(o.id)),
    [parentOptions, validTargetIds],
  );

  const [newParentId, setNewParentId] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setNewParentId("");
      setError(null);
    }
  }, [open, unitId]);

  const selectedParent = selectableOptions.find((o) => o.id === newParentId);
  const invalidSelection =
    newParentId &&
    (newParentId === unitId ||
      wouldReparentCreateCycle(hierarchyUnits, unitId, newParentId));

  async function confirmMove() {
    if (!newParentId || invalidSelection) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/org-units/${unitId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ parentId: newParentId }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data?.error ?? "Verschieben fehlgeschlagen.");
        return;
      }
      orgHistory?.pushReparent({
        unitId,
        unitName,
        beforeParentId: currentParentId,
        afterParentId: newParentId,
        onRefresh: () => onSuccess?.(),
      });
      onSuccess?.();
      onClose();
    } catch {
      setError("Netzwerkfehler.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog
      open={open}
      onClose={() => {
        if (!loading) onClose();
      }}
      title={`„${unitName}" verschieben?`}
      description="Die übergeordnete Einheit wird serverseitig mit Zyklus- und Tiefenprüfung gespeichert."
      size="md"
      footer={null}
    >
      <div className="space-y-4">
        <label className="block space-y-1.5 text-sm">
          <span className="font-medium text-[var(--text-1)]">Neue übergeordnete Einheit</span>
          <select
            className="fca-input w-full"
            value={newParentId}
            onChange={(e) => setNewParentId(e.target.value)}
            aria-invalid={Boolean(invalidSelection)}
            data-testid="org-reparent-parent-select"
          >
            <option value="">— Auswählen —</option>
            {selectableOptions.map((opt) => (
              <option key={opt.id} value={opt.id}>
                {"—".repeat(Math.max(0, opt.level))} {opt.name}
              </option>
            ))}
          </select>
        </label>
        {currentParentId ? (
          <p className="text-xs text-[var(--muted)]">
            Aktuell unter einer übergeordneten Einheit eingeordnet.
          </p>
        ) : null}
        {invalidSelection ? (
          <p className="text-sm text-rose-400" role="alert">
            Diese Zuordnung würde einen Zyklus erzeugen oder ist ungültig.
          </p>
        ) : null}
        {error ? (
          <p className="text-sm text-rose-400" role="alert">
            {error}
          </p>
        ) : null}
        <div className="flex justify-end gap-2">
          <button type="button" className="fca-button-secondary" onClick={onClose} disabled={loading}>
            Abbrechen
          </button>
          <button
            type="button"
            className="fca-button-primary"
            onClick={() => void confirmMove()}
            disabled={loading || !newParentId || Boolean(invalidSelection)}
            data-testid="org-reparent-confirm"
          >
            {loading ? "Speichern…" : "Verschieben"}
          </button>
        </div>
      </div>
    </Dialog>
  );
}
