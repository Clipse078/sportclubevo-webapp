"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { CommunicationInboxPaneResizeHandle } from "@/components/admin/communication/inbox/CommunicationInboxPaneResizeHandle";
import {
  INBOX_SPLIT_HANDLE_PX,
  canRenderSideBySideSplit,
  computeListSplitPercentBounds,
  inboxLayoutIsMasterDetailOnDesktop,
  inboxLayoutUsesHorizontalSplit,
  inboxLayoutUsesVerticalSplit,
  resolveEffectiveListSplitPercent,
  type InboxWorkspaceLayout,
} from "@/lib/communication/inbox/inbox-workspace-preferences";
import { INBOX_PANE_SHELL_CLASS } from "@/lib/communication/inbox/inbox-workspace-layout-contract";

type CommunicationInboxWorkspaceLayoutProps = {
  layout: InboxWorkspaceLayout;
  listSplitPercent: number;
  onListSplitPercentChange: (percent: number, options?: { persist?: boolean }) => void;
  onSplitPersist: () => void;
  mobilePane: "list" | "detail";
  selectedId: string | null;
  list: ReactNode;
  detail: ReactNode;
};

export function CommunicationInboxWorkspaceLayout({
  layout,
  listSplitPercent,
  onListSplitPercentChange,
  onSplitPersist,
  mobilePane,
  selectedId,
  list,
  detail,
}: CommunicationInboxWorkspaceLayoutProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState(0);
  const [containerHeight, setContainerHeight] = useState(0);
  const [isLg, setIsLg] = useState(true);

  useEffect(() => {
    const readIsLg = () => {
      if (typeof window.matchMedia === "function") {
        return window.matchMedia("(min-width: 1024px)").matches;
      }
      return window.innerWidth >= 1024;
    };
    const sync = () => setIsLg(readIsLg());
    sync();
    if (typeof window.matchMedia !== "function") {
      window.addEventListener("resize", sync);
      return () => window.removeEventListener("resize", sync);
    }
    const lgQuery = window.matchMedia("(min-width: 1024px)");
    lgQuery.addEventListener("change", sync);
    return () => lgQuery.removeEventListener("change", sync);
  }, []);

  useEffect(() => {
    const node = containerRef.current;
    if (!node || typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (!entry) return;
      setContainerWidth(entry.contentRect.width);
      setContainerHeight(entry.contentRect.height);
    });
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  const forcedMasterDetail =
    inboxLayoutIsMasterDetailOnDesktop(layout) ||
    (inboxLayoutUsesVerticalSplit(layout) &&
      containerWidth > 0 &&
      !canRenderSideBySideSplit(containerWidth, listSplitPercent));

  const useMasterDetail = !isLg || forcedMasterDetail;

  let showList = true;
  let showDetail = true;
  if (useMasterDetail) {
    showList = mobilePane === "list" || selectedId == null;
    showDetail = selectedId != null && mobilePane === "detail";
  }

  const effectiveSplit = resolveEffectiveListSplitPercent(
    layout,
    listSplitPercent,
    inboxLayoutUsesHorizontalSplit(layout) ? containerHeight : containerWidth,
  );

  const splitBounds = computeListSplitPercentBounds(
    inboxLayoutUsesHorizontalSplit(layout) ? containerHeight : containerWidth,
  );

  const applySplitDelta = useCallback(
    (deltaPx: number) => {
      const primary = inboxLayoutUsesHorizontalSplit(layout) ? containerHeight : containerWidth;
      if (primary <= 0) return;
      const listPx = (primary * effectiveSplit) / 100;
      const nextListPx = listPx + deltaPx;
      const nextPercent = (nextListPx / primary) * 100;
      onListSplitPercentChange(nextPercent, { persist: false });
    },
    [
      containerHeight,
      containerWidth,
      effectiveSplit,
      layout,
      onListSplitPercentChange,
    ],
  );

  const verticalSplit =
    isLg && inboxLayoutUsesVerticalSplit(layout) && !forcedMasterDetail;
  const horizontalSplit = isLg && inboxLayoutUsesHorizontalSplit(layout) && containerHeight > 0;

  const gridStyle = verticalSplit
    ? {
        gridTemplateColumns: `${effectiveSplit}% ${INBOX_SPLIT_HANDLE_PX}px minmax(0, 1fr)`,
      }
    : undefined;

  const stackStyle = horizontalSplit
    ? {
        gridTemplateRows: `${effectiveSplit}% ${INBOX_SPLIT_HANDLE_PX}px minmax(0, 1fr)`,
      }
    : undefined;

  return (
    <div
      ref={containerRef}
      className="grid min-h-0 flex-1 grid-cols-1 gap-4 lg:gap-0"
      style={verticalSplit ? gridStyle : horizontalSplit ? stackStyle : undefined}
      data-communication-inbox-layout={layout}
      data-master-detail={useMasterDetail ? "true" : "false"}
    >
      {showList ? (
        <div className={INBOX_PANE_SHELL_CLASS}>{list}</div>
      ) : null}

      {verticalSplit ? (
        <CommunicationInboxPaneResizeHandle
          orientation="vertical"
          label="Breite der Konversationsliste anpassen"
          valueNow={effectiveSplit}
          valueMin={splitBounds.minPercent}
          valueMax={splitBounds.maxPercent}
          onResizeDelta={applySplitDelta}
          onResizeEnd={onSplitPersist}
        />
      ) : null}

      {horizontalSplit ? (
        <CommunicationInboxPaneResizeHandle
          orientation="horizontal"
          label="Höhe der Konversationsliste anpassen"
          valueNow={effectiveSplit}
          valueMin={splitBounds.minPercent}
          valueMax={splitBounds.maxPercent}
          onResizeDelta={applySplitDelta}
          onResizeEnd={onSplitPersist}
        />
      ) : null}

      {showDetail ? (
        <div className={INBOX_PANE_SHELL_CLASS}>{detail}</div>
      ) : null}
    </div>
  );
}
