"use client";

import { useRef, useState, useTransition, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Plus,
  Pencil,
  Archive,
  ChevronDown,
  ChevronRight,
  Building2,
  MapPin,
  Trash2,
  AlertTriangle,
  MoreHorizontal,
} from "lucide-react";
import { cn } from "@/lib/cn";
import { PopoverContent } from "@/components/ui/Popover";
import type { FacilityType, FacilityResourceType, FacilityStatus } from "@prisma/client";

// ── Types matching lib/facilities/queries.ts ─────────────────────────────────

type ResourceRow = {
  id: string;
  name: string;
  code: string;
  type: FacilityResourceType;
  status: FacilityStatus;
  sortOrder: number;
};

type FacilityRow = {
  id: string;
  name: string;
  type: FacilityType;
  status: FacilityStatus;
  sortOrder: number;
  resources: ResourceRow[];
};

// ── Props ─────────────────────────────────────────────────────────────────────

type Props = {
  initialFacilities: FacilityRow[];
  canManage: boolean;
  canDelete: boolean;
  tenantId: string;
};

// ── Constants ─────────────────────────────────────────────────────────────────

const FACILITY_TYPE_LABELS: Record<FacilityType, string> = {
  PITCH: "Spielfeld",
  DRESSING_ROOM_BLOCK: "Garderobenblock",
  INDOOR_HALL: "Innenhalle",
  OTHER: "Sonstiges",
};

const RESOURCE_TYPE_LABELS: Record<FacilityResourceType, string> = {
  FULL_PITCH: "Ganzes Feld",
  HALF_PITCH: "Halbes Feld",
  DRESSING_ROOM: "Garderobe",
  OTHER: "Sonstiges",
};

const STATUS_LABELS: Record<FacilityStatus, string> = {
  ACTIVE: "Aktiv",
  INACTIVE: "Inaktiv",
  ARCHIVED: "Archiviert",
};

// ── Inline edit form component ────────────────────────────────────────────────

function InlineEditForm({
  value,
  onSave,
  onCancel,
  placeholder,
}: {
  value: string;
  onSave: (v: string) => void;
  onCancel: () => void;
  placeholder?: string;
}) {
  const [draft, setDraft] = useState(value);
  const [pending, startTransition] = useTransition();
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        const trimmed = draft.trim();
        if (!trimmed) return;
        startTransition(() => onSave(trimmed));
      }}
      className="flex items-center gap-2"
    >
      <input
        autoFocus
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        placeholder={placeholder}
        className="rounded-lg border border-[var(--blue)]/40 bg-white px-3 py-1.5 text-sm text-slate-900 outline-none focus:ring-2 focus:ring-[var(--blue)]/20"
      />
      <button
        type="submit"
        disabled={pending || !draft.trim()}
        className="fca-button-primary disabled:opacity-50"
      >
        Speichern
      </button>
      <button
        type="button"
        onClick={onCancel}
        className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600"
      >
        Abbrechen
      </button>
    </form>
  );
}

// ── Create Facility dialog ────────────────────────────────────────────────────

function CreateFacilityForm({
  onCreated,
  onCancel,
  onRefresh,
}: {
  onCreated: (facility: FacilityRow) => void;
  onCancel: () => void;
  onRefresh: () => void;
}) {
  const [name, setName] = useState("");
  const [type, setType] = useState<FacilityType>("PITCH");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setError(null);
    startTransition(async () => {
      const res = await fetch("/api/facilities", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), type }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data?.error ?? "Fehler beim Erstellen.");
        return;
      }
      const data = await res.json();
      onCreated({ ...data.facility, resources: [] });
      onRefresh();
    });
  }

  return (
    <form
      onSubmit={submit}
      className="rounded-2xl border border-[var(--blue)]/20 bg-[var(--blue-light)] p-5 space-y-4"
    >
      <p className="text-sm font-semibold text-[var(--blue)]">Neue Anlage erstellen</p>
      {error ? <p className="text-xs text-rose-600">{error}</p> : null}
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className="text-xs font-medium text-slate-600">Name</label>
          <input
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="z.B. Hauptplatz"
            className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[var(--blue)]/20"
          />
        </div>
        <div>
          <label className="text-xs font-medium text-slate-600">Typ</label>
          <select
            value={type}
            onChange={(e) => setType(e.target.value as FacilityType)}
            className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none"
          >
            {(Object.keys(FACILITY_TYPE_LABELS) as FacilityType[]).map((t) => (
              <option key={t} value={t}>
                {FACILITY_TYPE_LABELS[t]}
              </option>
            ))}
          </select>
        </div>
      </div>
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={pending || !name.trim()}
          className="fca-button-primary disabled:opacity-50"
        >
          {pending ? "Wird erstellt…" : "Anlage erstellen"}
        </button>
        <button
          type="button"
          disabled={pending}
          onClick={onCancel}
          className="fca-button-secondary disabled:opacity-50"
        >
          Abbrechen
        </button>
      </div>
    </form>
  );
}

// ── Create Resource form ──────────────────────────────────────────────────────

function CreateResourceForm({
  facilityId,
  onCreated,
  onCancel,
  onRefresh,
}: {
  facilityId: string;
  onCreated: (resource: ResourceRow) => void;
  onCancel: () => void;
  onRefresh: () => void;
}) {
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [type, setType] = useState<FacilityResourceType>("OTHER");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !code.trim()) return;
    setError(null);
    startTransition(async () => {
      const res = await fetch(`/api/facilities/${facilityId}/resources`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), code: code.trim(), type }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data?.error ?? "Fehler beim Erstellen.");
        return;
      }
      const data = await res.json();
      onCreated(data.resource);
      onRefresh();
    });
  }

  return (
    <form
      onSubmit={submit}
      className="mt-3 rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-3"
    >
      <p className="text-xs font-semibold text-slate-700">Neue Ressource hinzufügen</p>
      {error ? <p className="text-xs text-rose-600">{error}</p> : null}
      <div className="grid gap-2 sm:grid-cols-3">
        <div>
          <label className="text-xs font-medium text-slate-500">Name</label>
          <input
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="z.B. Hauptplatz A"
            className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs outline-none focus:ring-2 focus:ring-[var(--blue)]/20"
          />
        </div>
        <div>
          <label className="text-xs font-medium text-slate-500">Code</label>
          <input
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            placeholder="z.B. STADION_A"
            className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-mono outline-none focus:ring-2 focus:ring-[var(--blue)]/20"
          />
        </div>
        <div>
          <label className="text-xs font-medium text-slate-500">Typ</label>
          <select
            value={type}
            onChange={(e) => setType(e.target.value as FacilityResourceType)}
            className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs outline-none"
          >
            {(Object.keys(RESOURCE_TYPE_LABELS) as FacilityResourceType[]).map((t) => (
              <option key={t} value={t}>
                {RESOURCE_TYPE_LABELS[t]}
              </option>
            ))}
          </select>
        </div>
      </div>
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={pending || !name.trim() || !code.trim()}
          className="fca-button-primary disabled:opacity-50"
        >
          {pending ? "Wird hinzugefügt…" : "Hinzufügen"}
        </button>
        <button
          type="button"
          disabled={pending}
          onClick={onCancel}
          className="fca-button-secondary disabled:opacity-50"
        >
          Abbrechen
        </button>
      </div>
    </form>
  );
}

function FacilityActionsMenu({
  canManage,
  canDelete,
  isArchived,
  onEdit,
  onArchive,
  onDelete,
  label,
}: {
  canManage: boolean;
  canDelete: boolean;
  isArchived: boolean;
  onEdit: () => void;
  onArchive: () => void;
  onDelete: () => void;
  label: string;
}) {
  const anchorRef = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        ref={anchorRef}
        type="button"
        aria-label={`Aktionen für ${label}`}
        className="rounded-md p-1.5 text-[var(--muted)] hover:bg-[var(--surface-2)] hover:text-[var(--foreground)]"
        onClick={() => setOpen((v) => !v)}
      >
        <MoreHorizontal className="h-4 w-4" />
      </button>
      <PopoverContent
        open={open}
        onOpenChange={setOpen}
        anchorRef={anchorRef}
        matchAnchorWidth={false}
        maxHeight={200}
        className="min-w-[10rem] p-1"
      >
        {canManage && (
          <>
            <button
              type="button"
              disabled={isArchived}
              className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-xs hover:bg-[var(--surface-2)] disabled:opacity-40"
              onClick={() => {
                setOpen(false);
                onEdit();
              }}
            >
              <Pencil className="h-3.5 w-3.5" />
              Bearbeiten
            </button>
            <button
              type="button"
              className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-xs hover:bg-[var(--surface-2)]"
              onClick={() => {
                setOpen(false);
                onArchive();
              }}
            >
              <Archive className="h-3.5 w-3.5" />
              {isArchived ? "Wiederherstellen" : "Archivieren"}
            </button>
          </>
        )}
        {canDelete && (
          <button
            type="button"
            className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-xs text-rose-600 hover:bg-rose-500/10"
            onClick={() => {
              setOpen(false);
              onDelete();
            }}
          >
            <Trash2 className="h-3.5 w-3.5" />
            Löschen
          </button>
        )}
      </PopoverContent>
    </>
  );
}

// ── Resource row ──────────────────────────────────────────────────────────────

type ResourceImpact = {
  trainingAllocations: number;
  trainingSessionAllocations: number;
  tournamentResourceAllocations: number;
  tournamentParticipantAllocations: number;
  weekplannerPlanAllocations: number;
};

function ResourceItem({
  facilityId,
  resource,
  canManage,
  canDelete,
  onUpdate,
  onRefresh,
  onDeleted,
}: {
  facilityId: string;
  resource: ResourceRow;
  canManage: boolean;
  canDelete: boolean;
  onUpdate: (updated: ResourceRow) => void;
  onRefresh: () => void;
  onDeleted: (resourceId: string) => void;
}) {
  const [editingName, setEditingName] = useState(false);
  const [, startTransition] = useTransition();
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deleteImpact, setDeleteImpact] = useState<ResourceImpact | null>(null);
  const [loadingImpact, setLoadingImpact] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const isArchived = resource.status === "ARCHIVED";

  async function openDeleteDialog() {
    setShowDeleteDialog(true);
    setDeleteImpact(null);
    setDeleteError(null);
    setLoadingImpact(true);
    try {
      const res = await fetch(
        `/api/facilities/${facilityId}/resources/${resource.id}/permanent`,
        { method: "DELETE" },
      );
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error ?? "Vorschau nicht verfügbar.");
      setDeleteImpact(data?.impact ?? null);
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : "Fehler.");
    } finally {
      setLoadingImpact(false);
    }
  }

  async function confirmDelete() {
    setDeleting(true);
    setDeleteError(null);
    try {
      const res = await fetch(
        `/api/facilities/${facilityId}/resources/${resource.id}/permanent?confirm=true`,
        { method: "DELETE" },
      );
      const data = await res.json().catch(() => null);
      if (!res.ok) { setDeleteError(data?.error ?? "Fehler."); return; }
      setShowDeleteDialog(false);
      onDeleted(resource.id);
      onRefresh();
    } catch { setDeleteError("Netzwerkfehler."); }
    finally { setDeleting(false); }
  }

  const totalAllocations = deleteImpact
    ? deleteImpact.trainingAllocations +
      deleteImpact.trainingSessionAllocations +
      deleteImpact.tournamentResourceAllocations +
      deleteImpact.tournamentParticipantAllocations +
      deleteImpact.weekplannerPlanAllocations
    : 0;

  async function patchResource(data: Record<string, unknown>) {
    const res = await fetch(`/api/facilities/${facilityId}/resources/${resource.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (res.ok) {
      onUpdate({ ...resource, ...data } as ResourceRow);
      onRefresh();
    }
  }

  return (
    <div
      className={cn(
        "flex items-center justify-between gap-2 px-2 py-1.5",
        isArchived && "opacity-50",
      )}
      data-testid="facility-resource-row"
    >
      <div className="flex min-w-0 flex-1 items-center gap-3">
        <MapPin className="h-3.5 w-3.5 shrink-0 text-[var(--muted)]" />
        <div className="min-w-0">
          {editingName ? (
            <InlineEditForm
              value={resource.name}
              placeholder="Ressourcenname"
              onSave={(name) => {
                startTransition(async () => {
                  await patchResource({ name });
                  setEditingName(false);
                });
              }}
              onCancel={() => setEditingName(false)}
            />
          ) : (
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm font-medium text-[var(--foreground)]">{resource.name}</span>
              <span className="text-[11px] text-[var(--muted)]">
                {RESOURCE_TYPE_LABELS[resource.type]}
              </span>
            </div>
          )}
        </div>
      </div>

      {(canManage || canDelete) && !editingName ? (
        <FacilityActionsMenu
          canManage={canManage}
          canDelete={canDelete}
          isArchived={isArchived}
          onEdit={() => setEditingName(true)}
          onArchive={() =>
            startTransition(async () => {
              await patchResource({ status: isArchived ? "ACTIVE" : "ARCHIVED" });
            })
          }
          onDelete={openDeleteDialog}
          label={resource.name}
        />
      ) : null}

      {/* Delete confirmation dialog */}
      {showDeleteDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
            <h3 className="mb-1 text-base font-semibold text-slate-900">
              Ressource endgültig löschen
            </h3>
            <p className="mb-4 text-sm text-slate-500">
          &bdquo;{resource.name}&ldquo; ({resource.code}) dauerhaft entfernen.
        </p>
            {loadingImpact && (
              <p className="mb-4 text-sm text-slate-400">Auswirkungen werden geprüft…</p>
            )}
            {deleteImpact && (
              <div className="mb-4 space-y-3 text-sm">
                <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2">
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
                  <p className="text-amber-800">
                    {totalAllocations > 0
                      ? `${totalAllocations} Planungs-Zuweisung${totalAllocations !== 1 ? "en" : ""} werden entfernt. Trainings, Spiele und Turniere bleiben erhalten.`
                      : "Keine aktiven Planungszuweisungen. Sicher zu löschen."}
                  </p>
                </div>
              </div>
            )}
            {deleteError && <p className="mb-3 text-sm text-red-600">{deleteError}</p>}
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setShowDeleteDialog(false)}
                disabled={deleting}
                className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
              >
                Abbrechen
              </button>
              <button
                onClick={confirmDelete}
                disabled={deleting || loadingImpact || !!deleteError}
                className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-50"
              >
                {deleting ? "Löschen…" : "Endgültig löschen"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Facility card ─────────────────────────────────────────────────────────────

type FacilityImpact = { resources: number; totalAllocationRefs: number };

function FacilityCard({
  facility,
  canManage,
  canDelete,
  onUpdate,
  onRefresh,
  onDeleted,
}: {
  facility: FacilityRow;
  canManage: boolean;
  canDelete: boolean;
  onUpdate: (updated: FacilityRow) => void;
  onRefresh: () => void;
  onDeleted: (facilityId: string) => void;
}) {
  const [expanded, setExpanded] = useState(true);
  const [editingName, setEditingName] = useState(false);
  const [addingResource, setAddingResource] = useState(false);
  const [, startTransition] = useTransition();
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deleteImpact, setDeleteImpact] = useState<FacilityImpact | null>(null);
  const [loadingImpact, setLoadingImpact] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const isArchived = facility.status === "ARCHIVED";

  async function openDeleteDialog() {
    setShowDeleteDialog(true);
    setDeleteImpact(null);
    setDeleteError(null);
    setLoadingImpact(true);
    try {
      const res = await fetch(`/api/facilities/${facility.id}/permanent`, { method: "DELETE" });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error ?? "Vorschau nicht verfügbar.");
      setDeleteImpact(data?.impact ?? null);
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : "Fehler.");
    } finally {
      setLoadingImpact(false);
    }
  }

  async function confirmFacilityDelete() {
    setDeleting(true);
    setDeleteError(null);
    try {
      const res = await fetch(`/api/facilities/${facility.id}/permanent?confirm=true`, { method: "DELETE" });
      const data = await res.json().catch(() => null);
      if (!res.ok) { setDeleteError(data?.error ?? "Fehler."); return; }
      setShowDeleteDialog(false);
      onDeleted(facility.id);
      onRefresh();
    } catch { setDeleteError("Netzwerkfehler."); }
    finally { setDeleting(false); }
  }

  async function patchFacility(data: Record<string, unknown>) {
    const res = await fetch(`/api/facilities/${facility.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (res.ok) {
      onUpdate({ ...facility, ...data } as FacilityRow);
      onRefresh();
    }
  }

  function updateResource(updated: ResourceRow) {
    onUpdate({
      ...facility,
      resources: facility.resources.map((r) => (r.id === updated.id ? updated : r)),
    });
  }

  return (
    <div
      className={cn(
        "rounded-lg border border-[var(--border)] bg-[var(--surface)]",
        isArchived && "opacity-60",
      )}
      data-testid="facility-group"
    >
      {/* Facility header */}
      <div className="flex items-center gap-2 px-3 py-2">
        <button
          onClick={() => setExpanded((v) => !v)}
          className="shrink-0 text-slate-400 hover:text-slate-600"
        >
          {expanded ? (
            <ChevronDown className="h-4 w-4" />
          ) : (
            <ChevronRight className="h-4 w-4" />
          )}
        </button>

        <Building2 className="h-4 w-4 shrink-0 text-[var(--blue)]" />

        <div className="min-w-0 flex-1">
          {editingName ? (
            <InlineEditForm
              value={facility.name}
              placeholder="Anlagenname"
              onSave={(name) => {
                startTransition(async () => {
                  await patchFacility({ name });
                  setEditingName(false);
                });
              }}
              onCancel={() => setEditingName(false)}
            />
          ) : (
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm font-semibold text-[var(--foreground)]">
                {facility.name}
              </span>
              <span className="text-[11px] text-[var(--muted)]">
                {FACILITY_TYPE_LABELS[facility.type]} · {facility.resources.filter((r) => r.status !== "ARCHIVED").length} Ressourcen
              </span>
              {isArchived ? (
                <span className="rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[11px] font-medium text-amber-700">
                  Archiviert
                </span>
              ) : null}
            </div>
          )}
        </div>

        {(canManage || canDelete) && !editingName ? (
          <FacilityActionsMenu
            canManage={canManage}
            canDelete={canDelete}
            isArchived={isArchived}
            onEdit={() => setEditingName(true)}
            onArchive={() =>
              startTransition(async () => {
                await patchFacility({ status: isArchived ? "ACTIVE" : "ARCHIVED" });
              })
            }
            onDelete={openDeleteDialog}
            label={facility.name}
          />
        ) : null}
      </div>

      {/* Resources */}
      {expanded ? (
        <div className="border-t border-[var(--border)]/60 px-2 pb-2 pt-1">
          <div className="divide-y divide-[var(--border)]/40">
            {facility.resources.length === 0 ? (
              <p className="text-sm text-slate-400">Noch keine Ressourcen konfiguriert.</p>
            ) : (
              facility.resources.map((resource) => (
                <ResourceItem
                  key={resource.id}
                  facilityId={facility.id}
                  resource={resource}
                  canManage={canManage}
                  canDelete={canDelete}
                  onUpdate={updateResource}
                  onRefresh={onRefresh}
                  onDeleted={(rid) => {
                    onUpdate({
                      ...facility,
                      resources: facility.resources.filter((r) => r.id !== rid),
                    });
                  }}
                />
              ))
            )}
          </div>

          {canManage && !isArchived ? (
            addingResource ? (
              <CreateResourceForm
                facilityId={facility.id}
                onCreated={(resource) => {
                  onUpdate({ ...facility, resources: [...facility.resources, resource] });
                  setAddingResource(false);
                }}
                onCancel={() => setAddingResource(false)}
                onRefresh={onRefresh}
              />
            ) : (
              <button
                onClick={() => setAddingResource(true)}
                className="mt-3 flex items-center gap-1.5 rounded-xl border border-dashed border-slate-300 bg-slate-50 px-3 py-2 text-xs font-medium text-slate-500 transition hover:border-[var(--blue)]/40 hover:bg-[var(--blue-light)] hover:text-[var(--blue)]"
              >
                <Plus className="h-3.5 w-3.5" />
                Ressource hinzufügen
              </button>
            )
          ) : null}
        </div>
      ) : null}

      {/* Facility delete dialog */}
      {showDeleteDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
            <h3 className="mb-1 text-base font-semibold text-slate-900">
              Anlage endgültig löschen
            </h3>
            <p className="mb-4 text-sm text-slate-500">
              &bdquo;{facility.name}&ldquo; und alle Ressourcen dauerhaft entfernen.
            </p>
            {loadingImpact && <p className="mb-4 text-sm text-slate-400">Auswirkungen werden geprüft…</p>}
            {deleteImpact && (
              <div className="mb-4 space-y-3 text-sm">
                <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2">
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-red-600" />
                  <div className="text-red-800">
                    <p className="font-medium">Wird gelöscht:</p>
                    <ul className="mt-1 ml-3 list-disc space-y-0.5">
                      <li>Anlage &bdquo;{facility.name}&ldquo;</li>
                      {deleteImpact.resources > 0 && <li>{deleteImpact.resources} Ressource{deleteImpact.resources !== 1 ? "n" : ""}</li>}
                      {deleteImpact.totalAllocationRefs > 0 && (
                        <li>{deleteImpact.totalAllocationRefs} Planungs-Zuweisung{deleteImpact.totalAllocationRefs !== 1 ? "en" : ""} (Trainings/Spiele bleiben erhalten)</li>
                      )}
                    </ul>
                  </div>
                </div>
              </div>
            )}
            {deleteError && <p className="mb-3 text-sm text-red-600">{deleteError}</p>}
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setShowDeleteDialog(false)}
                disabled={deleting}
                className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
              >
                Abbrechen
              </button>
              <button
                onClick={confirmFacilityDelete}
                disabled={deleting || loadingImpact || !!deleteError}
                className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-50"
              >
                {deleting ? "Löschen…" : "Endgültig löschen"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Main panel ────────────────────────────────────────────────────────────────

export default function FacilitiesAdminPanel({
  initialFacilities,
  canManage,
  canDelete,
}: Props) {
  const router = useRouter();
  const [facilities, setFacilities] = useState<FacilityRow[]>(initialFacilities);
  const [showCreate, setShowCreate] = useState(false);

  // Sync local state when the server re-renders with fresh data (after router.refresh()).
  // This ensures the list reflects the latest server state after any mutation.
  useEffect(() => {
    setFacilities(initialFacilities);
  }, [initialFacilities]);

  function updateFacility(updated: FacilityRow) {
    setFacilities((prev) => prev.map((f) => (f.id === updated.id ? updated : f)));
  }

  function handleRefresh() {
    router.refresh();
  }

  return (
    <div className="space-y-5">
      {/* Action bar */}
      {canManage ? (
        showCreate ? (
          <CreateFacilityForm
            onCreated={(facility) => {
              setFacilities((prev) => [...prev, facility]);
              setShowCreate(false);
            }}
            onCancel={() => setShowCreate(false)}
            onRefresh={handleRefresh}
          />
        ) : (
          <button
            onClick={() => setShowCreate(true)}
            className="fca-button-primary flex items-center gap-2"
          >
            <Plus className="h-4 w-4" />
            Anlage erstellen
          </button>
        )
      ) : null}

      {/* Facility list */}
      {facilities.length === 0 ? (
        <div className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-6 text-center">
          <Building2 className="mx-auto h-8 w-8 text-[var(--muted)]" />
          <p className="mt-3 text-sm font-medium text-[var(--foreground)]">
            Noch keine Anlagen konfiguriert
          </p>
          <p className="mt-1 text-sm text-[var(--muted)]">
            Erstelle deine erste Anlage mit dem Button oben.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {facilities.map((facility) => (
            <FacilityCard
              key={facility.id}
              facility={facility}
              canManage={canManage}
              canDelete={canDelete}
              onUpdate={updateFacility}
              onRefresh={handleRefresh}
              onDeleted={(fid) => setFacilities((prev) => prev.filter((f) => f.id !== fid))}
            />
          ))}
        </div>
      )}

      {/* Info banner */}
      <div className="rounded-2xl border border-blue-100 bg-[var(--blue-light)] p-4">
        <p className="text-sm font-semibold text-[var(--blue)]">Wie funktioniert das?</p>
        <ul className="mt-2 space-y-1.5 text-sm text-slate-600">
          <li>
            <span className="font-medium">Anlagen</span> sind physische Standorte (Spielfeld,
            Garderobenblock, Halle).
          </li>
          <li>
            <span className="font-medium">Ressourcen</span> sind buchbare Einheiten mit einem
            stabilen Code (z.B. <code className="font-mono text-xs">STADION_A</code>).
          </li>
          <li>
            Infoboard und Wochenplanung zeigen automatisch die hier konfigurierten Bezeichnungen.
          </li>
          <li>
            Bestehende Codes werden als Fallback auf die FCA-Standardbezeichnungen aufgelöst,
            wenn keine Ressource konfiguriert ist.
          </li>
        </ul>
      </div>
    </div>
  );
}
