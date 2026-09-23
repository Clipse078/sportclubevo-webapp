"use client";

import { Menu, PanelRightClose, PanelRightOpen } from "lucide-react";
import { useCallback, useEffect, useState, type ReactNode } from "react";
import { useTranslations } from "next-intl";

import { Sheet } from "@/components/ui/Sheet";
import {
  clampWorkspaceInspectorWidth,
  clampWorkspaceNavWidth,
  persistWorkspaceInspectorOpen,
  persistWorkspaceInspectorWidth,
  persistWorkspaceNavWidth,
  readStoredWorkspaceInspectorWidth,
  readStoredWorkspaceNavWidth,
} from "@/lib/workspace/ui/workspace-pane-preferences";

import { WorkspacePaneResizeHandle } from "./WorkspacePaneResizeHandle";

type WorkspaceThreePaneLayoutProps = {
  nav: ReactNode;
  main: ReactNode;
  inspector: ReactNode;
  /** When false, inspector slot is hidden but selection may remain. */
  inspectorOpen: boolean;
  onInspectorOpenChange: (open: boolean) => void;
  /** Nav drawer for narrow viewports. */
  navDrawerTitle: string;
};

export function WorkspaceThreePaneLayout({
  nav,
  main,
  inspector,
  inspectorOpen,
  onInspectorOpenChange,
  navDrawerTitle,
}: WorkspaceThreePaneLayoutProps) {
  const t = useTranslations("Workspace.layout");
  const [navWidth, setNavWidth] = useState(() => readStoredWorkspaceNavWidth());
  const [inspectorWidth, setInspectorWidth] = useState(() =>
    readStoredWorkspaceInspectorWidth(),
  );
  const [navDrawerOpen, setNavDrawerOpen] = useState(false);
  const [isXl, setIsXl] = useState(true);
  const [isLg, setIsLg] = useState(true);

  useEffect(() => {
    const xlQuery = window.matchMedia("(min-width: 1280px)");
    const lgQuery = window.matchMedia("(min-width: 1024px)");
    const sync = () => {
      setIsXl(xlQuery.matches);
      setIsLg(lgQuery.matches);
    };
    sync();
    xlQuery.addEventListener("change", sync);
    lgQuery.addEventListener("change", sync);
    return () => {
      xlQuery.removeEventListener("change", sync);
      lgQuery.removeEventListener("change", sync);
    };
  }, []);

  const persistNav = useCallback((width: number) => {
    persistWorkspaceNavWidth(width);
  }, []);

  const persistInspector = useCallback((width: number) => {
    persistWorkspaceInspectorWidth(width);
  }, []);

  function toggleInspector() {
    const next = !inspectorOpen;
    onInspectorOpenChange(next);
    persistWorkspaceInspectorOpen(next);
  }

  function closeInspectorSheet() {
    onInspectorOpenChange(false);
    persistWorkspaceInspectorOpen(false);
  }

  const showInlineInspector = isXl && inspectorOpen;
  const showInspectorSheet = !isXl && inspectorOpen;
  const gridStyle = isXl
    ? {
        gridTemplateColumns: showInlineInspector
          ? `${navWidth}px 8px minmax(0, 1fr) 8px ${inspectorWidth}px`
          : `${navWidth}px 8px minmax(0, 1fr)`,
      }
    : isLg
      ? {
          gridTemplateColumns: `${navWidth}px 8px minmax(0, 1fr)`,
        }
      : undefined;

  return (
    <div className="min-h-[620px]">
      <div className="mb-2 flex items-center gap-2 lg:hidden">
        <button
          type="button"
          className="inline-flex h-9 items-center gap-2 rounded-lg border border-[var(--border)] px-3 text-sm font-medium text-[var(--text)] hover:bg-[var(--surface-2)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--sce-primary)]"
          onClick={() => setNavDrawerOpen(true)}
          aria-label={t("openNavDrawer")}
        >
          <Menu className="h-4 w-4" aria-hidden="true" />
          {t("foldersShort")}
        </button>
        <button
          type="button"
          className="inline-flex h-9 items-center gap-2 rounded-lg border border-[var(--border)] px-3 text-sm font-medium text-[var(--text)] hover:bg-[var(--surface-2)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--sce-primary)]"
          onClick={() => {
            onInspectorOpenChange(true);
            persistWorkspaceInspectorOpen(true);
          }}
          aria-label={t("openInspector")}
          aria-pressed={inspectorOpen}
        >
          {inspectorOpen ? (
            <PanelRightClose className="h-4 w-4" aria-hidden="true" />
          ) : (
            <PanelRightOpen className="h-4 w-4" aria-hidden="true" />
          )}
          {t("detailsShort")}
        </button>
      </div>

      <div
        className="grid gap-0 lg:grid-cols-[minmax(0,220px)_minmax(0,1fr)] xl:grid-cols-none"
        style={gridStyle}
        data-testid="workspace-three-pane-layout"
      >
        <aside
          className={`hidden min-h-0 flex-col overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)] lg:flex ${
            isXl ? "" : "col-span-1"
          }`}
        >
          {nav}
        </aside>

        {isXl ? (
          <WorkspacePaneResizeHandle
            label={t("resizeNav")}
            onResizeDelta={(delta) => {
              setNavWidth((w) => clampWorkspaceNavWidth(w + delta));
            }}
            onResizeEnd={() => {
              setNavWidth((w) => {
                persistNav(w);
                return w;
              });
            }}
          />
        ) : isLg ? (
          <WorkspacePaneResizeHandle
            label={t("resizeNav")}
            onResizeDelta={(delta) => {
              setNavWidth((w) => clampWorkspaceNavWidth(w + delta));
            }}
            onResizeEnd={() => {
              setNavWidth((w) => {
                persistNav(w);
                return w;
              });
            }}
          />
        ) : null}

        <div className="min-w-0 lg:col-span-1">{main}</div>

        {isXl && showInlineInspector ? (
          <>
            <WorkspacePaneResizeHandle
              label={t("resizeInspector")}
              invertDelta
              onResizeDelta={(delta) => {
                setInspectorWidth((w) => clampWorkspaceInspectorWidth(w + delta));
              }}
              onResizeEnd={() => {
                setInspectorWidth((w) => {
                  persistInspector(w);
                  return w;
                });
              }}
            />
            <aside
              className="flex min-h-0 min-w-0 flex-col overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)]"
              data-testid="workspace-inspector-pane"
            >
              <div className="flex shrink-0 items-center justify-end border-b border-[var(--border)] px-3 py-2">
                <button
                  type="button"
                  onClick={toggleInspector}
                  className="inline-flex h-8 items-center gap-1.5 rounded-lg px-2 text-xs font-medium text-[var(--text-2)] hover:bg-[var(--surface-2)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--sce-primary)]"
                  aria-label={t("closeInspector")}
                >
                  <PanelRightClose className="h-4 w-4" aria-hidden="true" />
                  {t("closeInspector")}
                </button>
              </div>
              {inspector}
            </aside>
          </>
        ) : null}

      </div>

      {showInspectorSheet ? (
        <Sheet
          open={showInspectorSheet}
          onClose={closeInspectorSheet}
          title={t("inspectorSheetTitle")}
        >
          <div className="-mx-6 -my-5 min-h-[50vh]">{inspector}</div>
        </Sheet>
      ) : null}

      <Sheet open={navDrawerOpen} onClose={() => setNavDrawerOpen(false)} title={navDrawerTitle}>
        <div className="-mx-6 -my-5">{nav}</div>
      </Sheet>
    </div>
  );
}
