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
import {
  clampOrgCanvasScale,
  computeOrgCanvasFitToView,
  getOrgContextualZoomLevel,
  orgCanvasGridBackgroundStyle,
  ORG_CANVAS_MAX_SCALE,
  ORG_CANVAS_MIN_SCALE,
} from "@/lib/org/org-canvas-viewport";
import {
  expandCollapsedAncestors,
  loadOrgLayoutPositions,
  mergeLayoutWithManualPositions,
  saveOrgLayoutPositions,
  type OrgLayoutPositionMap,
} from "@/lib/org/org-layout-persistence";
import { computeOrgLayoutBoundingBox } from "@/lib/org/org-layout-bounds";
import OrgUnitReparentDialog from "@/components/admin/org/OrgUnitReparentDialog";
import OrgUnitNodeCard, { type OrgUnitCanvasNodeData } from "@/components/admin/org/OrgUnitNodeCard";
import { Dialog } from "@/components/ui/Dialog";
import { cn } from "@/lib/cn";
import { LayoutGrid, Maximize2, Search, ZoomIn, ZoomOut } from "lucide-react";

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
  tenantId: string;
  orgUnits: OrgUnitCanvasItem[];
  canManage: boolean;
  selectedId: string | null;
  onSelectId: (id: string | null) => void;
  onAddChild: (parentId: string) => void;
  onReparentSuccess?: () => void;
  parentOptions?: { id: string; key: string; name: string; level: number; type: string }[];
};

const ORG_CANVAS_TOOLBAR_INSET_PX = 52;
const ORG_INSPECTOR_INSET_PX = 352;

type NodeDragState = {
  nodeId: string;
  pointerId: number;
  startClientX: number;
  startClientY: number;
  startX: number;
  startY: number;
};

export default function OrgUnitCanvasView({
  tenantId,
  orgUnits,
  canManage,
  selectedId,
  onSelectId,
  onAddChild,
  onReparentSuccess,
  parentOptions = [],
}: Props) {
  const viewportRef = useRef<HTMLDivElement>(null);
  const didInitialFit = useRef(false);
  const [collapsed, setCollapsed] = useState<Set<string>>(() => new Set());
  const [manualPositions, setManualPositions] = useState<OrgLayoutPositionMap>(() =>
    loadOrgLayoutPositions(tenantId),
  );
  const [scale, setScale] = useState(1);
  const [pan, setPan] = useState({ x: 24, y: 24 });
  const [isPanning, setIsPanning] = useState(false);
  const [spacePan, setSpacePan] = useState(false);
  const panStart = useRef({ x: 0, y: 0, panX: 0, panY: 0 });
  const [searchQuery, setSearchQuery] = useState("");
  const [reparentDraggingId, setReparentDraggingId] = useState<string | null>(null);
  const [dropTargetId, setDropTargetId] = useState<string | null>(null);
  const [nodeDrag, setNodeDrag] = useState<NodeDragState | null>(null);
  const [reparentPending, setReparentPending] = useState<{
    unitId: string;
    newParentId: string;
    unitName: string;
    parentName: string;
  } | null>(null);
  const [autoLayoutConfirmOpen, setAutoLayoutConfirmOpen] = useState(false);
  const [reparentError, setReparentError] = useState<string | null>(null);
  const [reparentLoading, setReparentLoading] = useState(false);
  const [reparentFormUnitId, setReparentFormUnitId] = useState<string | null>(null);

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

  const autoLayout = useMemo(
    () => buildOrgHierarchyLayout(hierarchyUnits, collapsed),
    [hierarchyUnits, collapsed],
  );

  const layoutNodes = useMemo(
    () => mergeLayoutWithManualPositions(autoLayout.nodes, manualPositions),
    [autoLayout.nodes, manualPositions],
  );

  const layout = useMemo(() => {
    const box = computeOrgLayoutBoundingBox(layoutNodes);
    return {
      nodes: layoutNodes,
      edges: autoLayout.edges,
      width: Math.max(autoLayout.width, box.width),
      height: Math.max(autoLayout.height, box.height),
      boundingBox: box,
    };
  }, [layoutNodes, autoLayout.edges, autoLayout.width, autoLayout.height]);

  const unitById = useMemo(() => new Map(orgUnits.map((u) => [u.id, u])), [orgUnits]);
  const contextualZoom = getOrgContextualZoomLevel(scale);

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

  const persistManual = useCallback(
    (next: OrgLayoutPositionMap) => {
      setManualPositions(next);
      saveOrgLayoutPositions(tenantId, next);
    },
    [tenantId],
  );

  const applyFitToView = useCallback(() => {
    const viewport = viewportRef.current;
    if (!viewport || layout.nodes.length === 0) return;
    const box = layout.boundingBox;
    const result = computeOrgCanvasFitToView({
      viewportWidth: viewport.clientWidth,
      viewportHeight: viewport.clientHeight,
      layoutWidth: layout.width,
      layoutHeight: layout.height,
      boundsMinX: box.minX,
      boundsMinY: box.minY,
      contentWidth: box.width,
      contentHeight: box.height,
      chromeInsets: {
        top: ORG_CANVAS_TOOLBAR_INSET_PX,
        right: selectedId ? ORG_INSPECTOR_INSET_PX : 0,
      },
    });
    setScale(result.scale);
    setPan({ x: result.panX, y: result.panY });
  }, [layout, selectedId]);

  const focusNodeLegible = useCallback(
    (id: string) => {
      const node = layout.nodes.find((n) => n.id === id);
      const viewport = viewportRef.current;
      if (!node || !viewport) return;
      const vw = viewport.clientWidth;
      const vh = viewport.clientHeight;
      const targetScale = clampOrgCanvasScale(Math.max(scale, 0.85));
      const cx = node.x + node.width / 2;
      const cy = node.y + node.height / 2;
      setScale(targetScale);
      setPan({
        x: vw / 2 - cx * targetScale,
        y: vh / 2 - cy * targetScale,
      });
      onSelectId(id);
    },
    [layout.nodes, onSelectId, scale],
  );

  useEffect(() => {
    if (didInitialFit.current) return;
    if (layout.nodes.length === 0) return;
    didInitialFit.current = true;
    applyFitToView();
  }, [applyFitToView, layout.nodes.length]);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.code === "Space" && !(e.target as HTMLElement)?.closest?.("input, textarea, select")) {
        e.preventDefault();
        setSpacePan(true);
      }
    }
    function onKeyUp(e: KeyboardEvent) {
      if (e.code === "Space") setSpacePan(false);
    }
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
    };
  }, []);

  useEffect(() => {
    if (!searchQuery.trim()) return;
    const q = searchQuery.trim().toLowerCase();
    const match = orgUnits.find(
      (u) => u.name.toLowerCase().includes(q) || u.key.toLowerCase().includes(q),
    );
    if (!match) return;
    setCollapsed((prev) => expandCollapsedAncestors(match.id, hierarchyUnits, prev));
    focusNodeLegible(match.id);
  }, [searchQuery, orgUnits, hierarchyUnits, focusNodeLegible]);

  const handleWheel = (e: ReactWheelEvent) => {
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
      const delta = e.deltaY > 0 ? -0.08 : 0.08;
      setScale((s) => clampOrgCanvasScale(s + delta));
      return;
    }
    if (Math.abs(e.deltaX) > 0 || Math.abs(e.deltaY) > 0) {
      setPan((p) => ({
        x: p.x - e.deltaX,
        y: p.y - e.deltaY,
      }));
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

  function runAutoLayout() {
    persistManual({});
    setAutoLayoutConfirmOpen(false);
    requestAnimationFrame(() => applyFitToView());
  }

  function requestAutoLayout() {
    const hasManual = Object.keys(manualPositions).length > 0;
    if (hasManual) {
      setAutoLayoutConfirmOpen(true);
      return;
    }
    runAutoLayout();
  }

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

  const highlightedEdgeKeys = useMemo(() => {
    if (!selectedId) return new Set<string>();
    const parentById = new Map(hierarchyUnits.map((u) => [u.id, u.parentId]));
    const onPath = new Set<string>();
    onPath.add(selectedId);
    let current: string | null = parentById.get(selectedId) ?? null;
    while (current) {
      onPath.add(current);
      current = parentById.get(current) ?? null;
    }
    for (const u of hierarchyUnits) {
      let p: string | null = u.parentId;
      while (p) {
        if (p === selectedId) {
          onPath.add(u.id);
          break;
        }
        p = parentById.get(p) ?? null;
      }
    }
    const keys = new Set<string>();
    for (const edge of layout.edges) {
      if (onPath.has(edge.fromId) && onPath.has(edge.toId)) {
        keys.add(`${edge.fromId}-${edge.toId}`);
      }
    }
    return keys;
  }, [hierarchyUnits, layout.edges, selectedId]);

  const gridStyle = orgCanvasGridBackgroundStyle(pan.x, pan.y, scale);

  return (
    <div
      className="flex min-h-[min(70vh,640px)] flex-1 flex-col overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--surface-1)]"
      data-testid="org-unit-canvas-shell"
    >
      <div
        className="flex flex-wrap items-center gap-2 border-b border-[var(--border)] bg-[var(--surface-2)]/80 px-3 py-2"
        data-testid="org-canvas-toolbar"
      >
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
        <div className="flex items-center gap-1" role="toolbar" aria-label="Organigramm-Steuerung">
          <button
            type="button"
            className="fca-button-secondary p-2"
            aria-label="Verkleinern"
            data-testid="org-canvas-zoom-out"
            onClick={() => setScale((s) => clampOrgCanvasScale(s - 0.1))}
          >
            <ZoomOut className="h-4 w-4" />
          </button>
          <span
            className="min-w-[3.25rem] px-1 text-center text-xs font-medium tabular-nums text-[var(--muted)]"
            aria-live="polite"
            data-testid="org-canvas-zoom-level"
          >
            {Math.round(scale * 100)}%
          </span>
          <button
            type="button"
            className="fca-button-secondary p-2"
            aria-label="Vergrössern"
            data-testid="org-canvas-zoom-in"
            onClick={() => setScale((s) => clampOrgCanvasScale(s + 0.1))}
          >
            <ZoomIn className="h-4 w-4" />
          </button>
          <button
            type="button"
            className="fca-button-secondary inline-flex items-center gap-1 px-2.5 py-2 text-xs"
            aria-label="Hierarchie einpassen"
            data-testid="org-canvas-fit"
            onClick={applyFitToView}
          >
            <Maximize2 className="h-4 w-4" />
            <span className="hidden sm:inline">Einpassen</span>
          </button>
          <button
            type="button"
            className="fca-button-secondary inline-flex items-center gap-1 px-2.5 py-2 text-xs"
            aria-label="Automatisches Layout"
            data-testid="org-canvas-auto-layout"
            onClick={requestAutoLayout}
          >
            <LayoutGrid className="h-4 w-4" />
            <span className="hidden sm:inline">Auto-Layout</span>
          </button>
        </div>
      </div>

      <div
        ref={viewportRef}
        className={cn(
          "relative min-h-0 flex-1 touch-none overflow-hidden bg-[#0c1220]",
          isPanning || spacePan ? "cursor-grabbing" : "cursor-grab",
        )}
        style={gridStyle}
        onWheel={handleWheel}
        onPointerDown={(e) => {
          const target = e.target as HTMLElement;
          if (target.closest("[data-org-unit-node]") && !spacePan) return;
          if (target.closest("[data-org-reparent-handle]")) return;
          setIsPanning(true);
          panStart.current = { x: e.clientX, y: e.clientY, panX: pan.x, panY: pan.y };
          (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
        }}
        onPointerMove={(e) => {
          if (nodeDrag && nodeDrag.pointerId === e.pointerId) {
            const dx = (e.clientX - nodeDrag.startClientX) / scale;
            const dy = (e.clientY - nodeDrag.startClientY) / scale;
            const nextX = nodeDrag.startX + dx;
            const nextY = nodeDrag.startY + dy;
            setManualPositions((prev) => ({
              ...prev,
              [nodeDrag.nodeId]: { x: nextX, y: nextY },
            }));
            return;
          }
          if (!isPanning) return;
          setPan({
            x: panStart.current.panX + (e.clientX - panStart.current.x),
            y: panStart.current.panY + (e.clientY - panStart.current.y),
          });
        }}
        onPointerUp={(e) => {
          if (nodeDrag && nodeDrag.pointerId === e.pointerId) {
            const dx = (e.clientX - nodeDrag.startClientX) / scale;
            const dy = (e.clientY - nodeDrag.startClientY) / scale;
            setManualPositions((prev) => {
              const next = {
                ...prev,
                [nodeDrag.nodeId]: { x: nodeDrag.startX + dx, y: nodeDrag.startY + dy },
              };
              saveOrgLayoutPositions(tenantId, next);
              return next;
            });
            setNodeDrag(null);
          }
          setIsPanning(false);
          try {
            (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
          } catch {
            /* ignore */
          }
        }}
        onPointerLeave={() => {
          setIsPanning(false);
          setNodeDrag(null);
        }}
        data-testid="org-unit-canvas-viewport"
        role="application"
        aria-label="Organisationshierarchie Organigramm"
      >
        <div
          className="absolute origin-top-left motion-reduce:transition-none transition-transform duration-150"
          style={{
            transform: `translate(${pan.x}px, ${pan.y}px) scale(${scale})`,
            width: layout.width,
            height: layout.height,
          }}
          data-testid="org-canvas-transform-layer"
        >
          <svg
            className="pointer-events-none absolute inset-0 overflow-visible"
            width={layout.width}
            height={layout.height}
            aria-hidden
          >
            {layout.edges.map((edge) => {
              const key = `${edge.fromId}-${edge.toId}`;
              const emphasized = highlightedEdgeKeys.has(key);
              return (
                <path
                  key={key}
                  d={connectorPath(edge.fromId, edge.toId)}
                  fill="none"
                  stroke={
                    emphasized
                      ? "color-mix(in srgb, var(--sce-accent) 55%, var(--border-strong))"
                      : "color-mix(in srgb, var(--sce-primary) 28%, var(--border-strong))"
                  }
                  strokeWidth={emphasized ? 2 : 1.5}
                  opacity={emphasized ? 1 : 0.65}
                />
              );
            })}
          </svg>

          {layout.nodes.map((node) => {
            const data = nodeDataById.get(node.id);
            if (!data) return null;
            const isDropTarget =
              dropTargetId === node.id && reparentDraggingId && reparentDraggingId !== node.id;
            const isInvalidDrop =
              isDropTarget &&
              reparentDraggingId &&
              wouldReparentCreateCycle(hierarchyUnits, reparentDraggingId, node.id);

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
                  if (!canManage || !reparentDraggingId) return;
                  e.preventDefault();
                  setDropTargetId(node.id);
                }}
                onDragLeave={() => setDropTargetId((id) => (id === node.id ? null : id))}
                onDrop={(e) => {
                  e.preventDefault();
                  if (!canManage || !reparentDraggingId || reparentDraggingId === node.id) return;
                  setDropTargetId(null);
                  if (wouldReparentCreateCycle(hierarchyUnits, reparentDraggingId, node.id)) return;
                  const unit = unitById.get(reparentDraggingId);
                  const parent = unitById.get(node.id);
                  if (!unit || !parent) return;
                  setReparentPending({
                    unitId: reparentDraggingId,
                    newParentId: node.id,
                    unitName: unit.name,
                    parentName: parent.name,
                  });
                }}
                onPointerDown={(e) => {
                  if (!canManage || spacePan) return;
                  if ((e.target as HTMLElement).closest("[data-org-reparent-handle]")) return;
                  if ((e.target as HTMLElement).closest("button")) return;
                  e.stopPropagation();
                  setNodeDrag({
                    nodeId: node.id,
                    pointerId: e.pointerId,
                    startClientX: e.clientX,
                    startClientY: e.clientY,
                    startX: node.x,
                    startY: node.y,
                  });
                  (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
                }}
              >
                <OrgUnitNodeCard
                  unit={data}
                  selected={selectedId === node.id}
                  canManage={canManage}
                  density={contextualZoom}
                  isDragging={nodeDrag?.nodeId === node.id}
                  isReparentSource={reparentDraggingId === node.id}
                  isReparentTarget={Boolean(isDropTarget)}
                  isInvalidReparentTarget={Boolean(isInvalidDrop)}
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
                  onMove={canManage ? () => setReparentFormUnitId(node.id) : undefined}
                  onMore={() => onSelectId(node.id)}
                  onReparentDragStart={
                    canManage
                      ? (ev) => {
                          setReparentDraggingId(node.id);
                          ev.dataTransfer.setData("text/org-unit-id", node.id);
                          ev.dataTransfer.effectAllowed = "move";
                        }
                      : undefined
                  }
                  onReparentDragEnd={() => {
                    setReparentDraggingId(null);
                    setDropTargetId(null);
                  }}
                />
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
        title={
          reparentPending
            ? `„${reparentPending.unitName}" verschieben?`
            : "Einheit verschieben"
        }
        description="Neue übergeordnete Einheit bestätigen — serverseitige Zyklus- und Tiefenprüfung."
        size="md"
        footer={null}
      >
        {reparentPending ? (
          <div className="space-y-4">
            <p className="text-sm text-[var(--text-2)]">
              Neue übergeordnete Einheit:{" "}
              <strong className="text-[var(--text-1)]">{reparentPending.parentName}</strong>
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
                {reparentLoading ? "Speichern…" : "Verschieben"}
              </button>
            </div>
          </div>
        ) : null}
      </Dialog>

      <Dialog
        open={autoLayoutConfirmOpen}
        onClose={() => setAutoLayoutConfirmOpen(false)}
        title="Auto-Layout anwenden?"
        description="Manuelle Knotenpositionen werden durch das hierarchische Layout ersetzt. Die Organisationsstruktur (Eltern-Kind) bleibt unverändert."
        size="md"
        footer={null}
      >
        <div className="flex justify-end gap-2">
          <button type="button" className="fca-button-secondary" onClick={() => setAutoLayoutConfirmOpen(false)}>
            Abbrechen
          </button>
          <button type="button" className="fca-button-primary" onClick={runAutoLayout}>
            Auto-Layout anwenden
          </button>
        </div>
      </Dialog>

      {reparentFormUnitId && unitById.get(reparentFormUnitId) ? (
        <OrgUnitReparentDialog
          open={Boolean(reparentFormUnitId)}
          onClose={() => setReparentFormUnitId(null)}
          unitId={reparentFormUnitId}
          unitName={unitById.get(reparentFormUnitId)!.name}
          currentParentId={unitById.get(reparentFormUnitId)!.parentId}
          hierarchyUnits={hierarchyUnits}
          parentOptions={parentOptions}
          onSuccess={() => {
            setReparentFormUnitId(null);
            onReparentSuccess?.();
          }}
        />
      ) : null}
    </div>
  );
}

export { ORG_CANVAS_MIN_SCALE, ORG_CANVAS_MAX_SCALE };
