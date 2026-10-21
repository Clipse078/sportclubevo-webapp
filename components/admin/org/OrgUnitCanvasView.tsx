"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type WheelEvent as ReactWheelEvent,
} from "react";
import {
  buildOrgHierarchyLayout,
  wouldReparentCreateCycle,
  type OrgHierarchyUnit,
} from "@/lib/org/org-hierarchy-layout";
import OrgUnitNodeCard, { type OrgUnitCanvasNodeData } from "@/components/admin/org/OrgUnitNodeCard";
import { Dialog } from "@/components/ui/Dialog";
import { cn } from "@/lib/cn";
import { Crosshair, Maximize2, Search, ZoomIn, ZoomOut } from "lucide-react";

export type OrgUnitCanvasItem = OrgHierarchyUnit & {
  sortOrder: number;
  key: string;
  name: string;
  type: string;
  status: string;
  level: number;
  description: string | null;
  archivedAt: Date | null;
  _count: { memberships: number; children: number };
};

type Props = {
  orgUnits: OrgUnitCanvasItem[];
  canManage: boolean;
  selectedId: string | null;
  onSelectId: (id: string | null) => void;
  onAddChild: (parentId: string) => void;
  onReparentSuccess?: () => void;
};

const MIN_SCALE = 0.35;
const MAX_SCALE = 1.75;

export default function OrgUnitCanvasView({
  orgUnits,
  canManage,
  selectedId,
  onSelectId,
  onAddChild,
  onReparentSuccess,
}: Props) {
  const viewportRef = useRef<HTMLDivElement>(null);
  const [collapsed, setCollapsed] = useState<Set<string>>(() => new Set());
  const [scale, setScale] = useState(1);
  const [pan, setPan] = useState({ x: 24, y: 24 });
  const [isPanning, setIsPanning] = useState(false);
  const panStart = useRef({ x: 0, y: 0, panX: 0, panY: 0 });
  const [searchQuery, setSearchQuery] = useState("");
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dropTargetId, setDropTargetId] = useState<string | null>(null);
  const [reparentPending, setReparentPending] = useState<{
    unitId: string;
    newParentId: string;
    unitName: string;
    parentName: string;
  } | null>(null);
  const [reparentError, setReparentError] = useState<string | null>(null);
  const [reparentLoading, setReparentLoading] = useState(false);

  const hierarchyUnits: OrgHierarchyUnit[] = useMemo(
    () =>
      orgUnits.map((u) => ({
        id: u.id,
        parentId: u.parentId,
        sortOrder: u.sortOrder ?? 0,
        name: u.name,
      })),
    [orgUnits],
  );

  const layout = useMemo(
    () => buildOrgHierarchyLayout(hierarchyUnits, collapsed),
    [hierarchyUnits, collapsed],
  );

  const unitById = useMemo(() => new Map(orgUnits.map((u) => [u.id, u])), [orgUnits]);

  const nodeDataById = useMemo(() => {
    const map = new Map<string, OrgUnitCanvasNodeData>();
    for (const unit of orgUnits) {
      map.set(unit.id, {
        id: unit.id,
        name: unit.name,
        type: unit.type,
        status: unit.status,
        memberCount: unit._count.memberships,
        childCount: unit._count.children,
        hasChildren: unit._count.children > 0,
        collapsed: collapsed.has(unit.id),
      });
    }
    return map;
  }, [orgUnits, collapsed]);

  const focusNode = useCallback(
    (id: string) => {
      const node = layout.nodes.find((n) => n.id === id);
      const viewport = viewportRef.current;
      if (!node || !viewport) return;
      const vw = viewport.clientWidth;
      const vh = viewport.clientHeight;
      const cx = node.x + node.width / 2;
      const cy = node.y + node.height / 2;
      setPan({
        x: vw / 2 - cx * scale,
        y: vh / 2 - cy * scale,
      });
      onSelectId(id);
    },
    [layout.nodes, onSelectId, scale],
  );

  const fitToView = useCallback(() => {
    const viewport = viewportRef.current;
    if (!viewport || layout.nodes.length === 0) return;
    const vw = viewport.clientWidth;
    const vh = viewport.clientHeight;
    const pad = 32;
    const fitScale = Math.min(
      (vw - pad * 2) / layout.width,
      (vh - pad * 2) / layout.height,
      1,
    );
    const clamped = Math.max(MIN_SCALE, Math.min(MAX_SCALE, fitScale));
    setScale(clamped);
    setPan({
      x: (vw - layout.width * clamped) / 2,
      y: (vh - layout.height * clamped) / 2,
    });
  }, [layout]);

  useEffect(() => {
    fitToView();
  }, [fitToView, orgUnits.length]);

  useEffect(() => {
    if (!searchQuery.trim()) return;
    const q = searchQuery.trim().toLowerCase();
    const match = orgUnits.find(
      (u) => u.name.toLowerCase().includes(q) || u.key.toLowerCase().includes(q),
    );
    if (match) focusNode(match.id);
  }, [searchQuery, orgUnits, focusNode]);

  const handleWheel = (e: ReactWheelEvent) => {
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
      const delta = e.deltaY > 0 ? -0.08 : 0.08;
      setScale((s) => Math.max(MIN_SCALE, Math.min(MAX_SCALE, s + delta)));
    }
  };

  const connectorPath = (fromId: string, toId: string) => {
    const from = layout.nodes.find((n) => n.id === fromId);
    const to = layout.nodes.find((n) => n.id === toId);
    if (!from || !to) return "";
    const x1 = from.x + from.width / 2;
    const y1 = from.y + from.height;
    const x2 = to.x + to.width / 2;
    const y2 = to.y;
    const midY = (y1 + y2) / 2;
    return `M ${x1} ${y1} C ${x1} ${midY}, ${x2} ${midY}, ${x2} ${y2}`;
  };

  async function confirmReparent() {
    if (!reparentPending) return;
    setReparentLoading(true);
    setReparentError(null);
    try {
      const res = await fetch(`/api/org-units/${reparentPending.unitId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ parentId: reparentPending.newParentId }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setReparentError(data?.error ?? "Verschieben fehlgeschlagen.");
        return;
      }
      setReparentPending(null);
      onReparentSuccess?.();
    } catch {
      setReparentError("Netzwerkfehler.");
    } finally {
      setReparentLoading(false);
    }
  }

  return (
    <div className="flex min-h-[min(70vh,640px)] flex-1 flex-col overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--surface-0)]">
      <div className="flex flex-wrap items-center gap-2 border-b border-[var(--border)] px-3 py-2">
        <div className="relative min-w-[12rem] flex-1">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--muted)]" />
          <input
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Einheit suchen…"
            className="fca-input w-full pl-9"
            aria-label="Organisationseinheit suchen"
            data-testid="org-canvas-search"
          />
        </div>
        <div className="flex items-center gap-1">
          <button type="button" className="fca-button-secondary p-2" aria-label="Verkleinern" onClick={() => setScale((s) => Math.max(MIN_SCALE, s - 0.1))}>
            <ZoomOut className="h-4 w-4" />
          </button>
          <button type="button" className="fca-button-secondary p-2" aria-label="Vergrössern" onClick={() => setScale((s) => Math.min(MAX_SCALE, s + 0.1))}>
            <ZoomIn className="h-4 w-4" />
          </button>
          <button type="button" className="fca-button-secondary p-2" aria-label="Alles einpassen" onClick={fitToView}>
            <Maximize2 className="h-4 w-4" />
          </button>
          {selectedId ? (
            <button
              type="button"
              className="fca-button-secondary inline-flex items-center gap-1 px-3 py-2 text-xs"
              onClick={() => focusNode(selectedId)}
            >
              <Crosshair className="h-3.5 w-3.5" />
              Fokus
            </button>
          ) : null}
        </div>
      </div>

      <div
        ref={viewportRef}
        className={cn(
          "relative min-h-0 flex-1 touch-none overflow-hidden",
          isPanning ? "cursor-grabbing" : "cursor-grab",
        )}
        onWheel={handleWheel}
        onPointerDown={(e) => {
          if ((e.target as HTMLElement).closest("[data-org-unit-node]")) return;
          setIsPanning(true);
          panStart.current = { x: e.clientX, y: e.clientY, panX: pan.x, panY: pan.y };
          (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
        }}
        onPointerMove={(e) => {
          if (!isPanning) return;
          setPan({
            x: panStart.current.panX + (e.clientX - panStart.current.x),
            y: panStart.current.panY + (e.clientY - panStart.current.y),
          });
        }}
        onPointerUp={(e) => {
          setIsPanning(false);
          try {
            (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
          } catch {
            /* ignore */
          }
        }}
        onPointerLeave={() => setIsPanning(false)}
        data-testid="org-unit-canvas-viewport"
        role="application"
        aria-label="Organisationshierarchie Canvas"
      >
        <div
          className="absolute origin-top-left motion-reduce:transition-none transition-transform duration-150"
          style={{
            transform: `translate(${pan.x}px, ${pan.y}px) scale(${scale})`,
            width: layout.width,
            height: layout.height,
          }}
        >
          <svg
            className="pointer-events-none absolute inset-0 overflow-visible"
            width={layout.width}
            height={layout.height}
            aria-hidden
          >
            {layout.edges.map((edge) => (
              <path
                key={`${edge.fromId}-${edge.toId}`}
                d={connectorPath(edge.fromId, edge.toId)}
                fill="none"
                stroke="var(--border-strong)"
                strokeWidth={1.5}
                opacity={0.85}
              />
            ))}
          </svg>

          {layout.nodes.map((node) => {
            const data = nodeDataById.get(node.id);
            if (!data) return null;
            const isDropTarget = dropTargetId === node.id && draggingId && draggingId !== node.id;
            const isInvalidDrop =
              isDropTarget &&
              draggingId &&
              wouldReparentCreateCycle(hierarchyUnits, draggingId, node.id);

            return (
              <div
                key={node.id}
                className="absolute"
                style={{
                  left: node.x,
                  top: node.y,
                  width: node.width,
                  height: node.height,
                }}
                onDragOver={(e) => {
                  if (!canManage || !draggingId) return;
                  e.preventDefault();
                  setDropTargetId(node.id);
                }}
                onDragLeave={() => setDropTargetId((id) => (id === node.id ? null : id))}
                onDrop={(e) => {
                  e.preventDefault();
                  if (!canManage || !draggingId || draggingId === node.id) return;
                  setDropTargetId(null);
                  if (wouldReparentCreateCycle(hierarchyUnits, draggingId, node.id)) return;
                  const unit = unitById.get(draggingId);
                  const parent = unitById.get(node.id);
                  if (!unit || !parent) return;
                  setReparentPending({
                    unitId: draggingId,
                    newParentId: node.id,
                    unitName: unit.name,
                    parentName: parent.name,
                  });
                }}
              >
                <div
                  className={cn(
                    "h-full rounded-xl transition",
                    isDropTarget &&
                      (isInvalidDrop
                        ? "ring-2 ring-rose-500/60"
                        : "ring-2 ring-[var(--sce-accent)]/70"),
                  )}
                >
                  <OrgUnitNodeCard
                    unit={data}
                    selected={selectedId === node.id}
                    canManage={canManage}
                    onSelect={() => onSelectId(node.id)}
                    onToggleCollapse={() => {
                      setCollapsed((prev) => {
                        const next = new Set(prev);
                        if (next.has(node.id)) next.delete(node.id);
                        else next.add(node.id);
                        return next;
                      });
                    }}
                    onAddChild={canManage ? () => onAddChild(node.id) : undefined}
                    onDragStart={
                      canManage
                        ? (e) => {
                            setDraggingId(node.id);
                            e.dataTransfer.setData("text/org-unit-id", node.id);
                            e.dataTransfer.effectAllowed = "move";
                          }
                        : undefined
                    }
                    onDragEnd={() => {
                      setDraggingId(null);
                      setDropTargetId(null);
                    }}
                  />
                </div>
              </div>
            );
          })}
        </div>

        {orgUnits.length === 0 ? (
          <div className="absolute inset-0 flex items-center justify-center p-6 text-center text-sm text-[var(--muted)]">
            Keine Organisationseinheiten — erstelle die erste Einheit.
          </div>
        ) : null}
      </div>

      <Dialog
        open={Boolean(reparentPending)}
        onClose={() => {
          setReparentPending(null);
          setReparentError(null);
        }}
        title="Einheit verschieben"
        description="Die Hierarchie wird serverseitig mit Zyklus- und Tiefenprüfung gespeichert."
        size="md"
        footer={null}
      >
        {reparentPending ? (
          <div className="space-y-4">
            <p className="text-sm text-[var(--text-2)]">
              <strong className="text-[var(--text-1)]">{reparentPending.unitName}</strong> unter{" "}
              <strong className="text-[var(--text-1)]">{reparentPending.parentName}</strong> einordnen?
            </p>
            {reparentError ? (
              <p className="text-sm text-rose-400" role="alert">
                {reparentError}
              </p>
            ) : null}
            <div className="flex justify-end gap-2">
              <button
                type="button"
                className="fca-button-secondary"
                onClick={() => setReparentPending(null)}
                disabled={reparentLoading}
              >
                Abbrechen
              </button>
              <button
                type="button"
                className="fca-button-primary"
                onClick={() => void confirmReparent()}
                disabled={reparentLoading}
              >
                {reparentLoading ? "Speichern…" : "Verschieben bestätigen"}
              </button>
            </div>
          </div>
        ) : null}
      </Dialog>
    </div>
  );
}
