"use client";

import { useCallback } from "react";
import { useRouter } from "next/navigation";
import { SceSegmentedControl } from "@/components/admin/shared/SceSegmentedControl";
import { useOptionalContextDirtyNavigation } from "@/lib/context-tabs";
import SceInlineDiscardConfirm from "@/components/sce/club-development/SceInlineDiscardConfirm";
import { useState } from "react";

type ViewNavProps<T extends string> = {
  views: readonly T[];
  labels: Record<T, string>;
  activeView: T;
  buildHref: (view: T) => string;
  testId: string;
};

export default function VereinsentwicklungWorkspaceViewNav<T extends string>({
  views,
  labels,
  activeView,
  buildHref,
  testId,
}: ViewNavProps<T>) {
  const router = useRouter();
  const dirtyNav = useOptionalContextDirtyNavigation();
  const [pendingView, setPendingView] = useState<T | null>(null);

  const navigateTo = useCallback(
    (view: T) => {
      if (view === activeView) return;
      const href = buildHref(view);
      if (!dirtyNav?.isDirty) {
        router.push(href);
        return;
      }
      setPendingView(view);
    },
    [activeView, buildHref, dirtyNav?.isDirty, router],
  );

  const confirmDiscard = () => {
    if (!pendingView) return;
    dirtyNav?.setDirty(false);
    const href = buildHref(pendingView);
    setPendingView(null);
    router.push(href);
  };

  return (
    <div className="mb-6 space-y-3" data-testid={testId}>
      {pendingView ? (
        <SceInlineDiscardConfirm
          onContinueEditing={() => setPendingView(null)}
          onDiscard={confirmDiscard}
          testId={`${testId}-discard`}
        />
      ) : null}
      <SceSegmentedControl
        value={activeView}
        options={views.map((view) => ({ value: view, label: labels[view] }))}
        onChange={navigateTo}
        aria-label="Lokale Arbeitsansicht"
        testId={`${testId}-control`}
      />
    </div>
  );
}