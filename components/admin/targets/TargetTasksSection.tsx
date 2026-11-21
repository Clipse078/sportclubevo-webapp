"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import type { TargetConnectedTaskRow } from "@/lib/club-development/target-connected-tasks";
import { CD_VORHABEN_WORKSPACE_COPY, CD_TARGET_COPY } from "@/lib/club-development/product-copy";
import { VEREINSLEITUNG_PANEL_CLASS } from "@/components/admin/vereinsleitung/vereinsleitungSurfaceStyles";
import { VEREINSENTWICKLUNG_WORKSPACE_PRIMARY_BUTTON_CLASS } from "@/components/admin/club-development/vereinsentwicklung-workspace-primary-button";
import VereinsentwicklungAufgabeWorkspaceCreateCard from "@/components/admin/club-development/VereinsentwicklungAufgabeWorkspaceCreateCard";
import StrategyProgressIndicator from "@/components/admin/club-development/StrategyProgressIndicator";
import { CD_STRATEGY_PROGRESS_COPY } from "@/lib/club-development/strategy-progress-copy";

type Props = {
  targetId: string;
  targetTitle: string;
  tasks: TargetConnectedTaskRow[];
  canCreate: boolean;
  returnTo: string;
  orgUnitId?: string | null;
  showCreatedBanner?: boolean;
  deliveryProgressCaption?: string | null;
  deliveryProgressPercent?: number | null;
};

export default function TargetTasksSection({
  targetId,
  targetTitle,
  tasks,
  canCreate,
  showCreatedBanner = false,
  deliveryProgressCaption = null,
  deliveryProgressPercent = null,
}: Props) {
  const router = useRouter();
  const [createOpen, setCreateOpen] = useState(showCreatedBanner);

  return (
    <section className={VEREINSLEITUNG_PANEL_CLASS} data-testid="target-aufgaben-section">
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between sm:gap-4">
        <div
          className="flex min-w-0 flex-1 flex-col gap-2 sm:flex-row sm:items-center sm:gap-4"
          data-testid="target-aufgabenfortschritt-header"
        >
          <h3 className="shrink-0 text-[13px] font-semibold uppercase tracking-[0.12em] text-[var(--text-2)]">
            Aufgaben
          </h3>
          {deliveryProgressCaption ? (
            <div className="min-w-0 sm:max-w-md sm:flex-1" data-testid="target-aufgabenfortschritt">
              <StrategyProgressIndicator
                variant="compact"
                showEmptyReason
                label={CD_STRATEGY_PROGRESS_COPY.taskProgressLabel}
                percent={deliveryProgressCaption === "Noch keine Aufgaben" ? null : deliveryProgressPercent}
                unknownReason={deliveryProgressCaption === "Noch keine Aufgaben" ? "Noch keine Aufgaben" : null}
                countCaption={deliveryProgressCaption === "Noch keine Aufgaben" ? null : deliveryProgressCaption}
                accentClass="bg-[var(--sce-info)]"
                testId="target-delivery-progress-bar"
              />
            </div>
          ) : null}
        </div>
        {canCreate ? (
          <button
            type="button"
            className={`${VEREINSENTWICKLUNG_WORKSPACE_PRIMARY_BUTTON_CLASS} shrink-0`}
            data-testid="target-aufgabe-erstellen"
            data-sce-contextual-create-flow="inline-collapsible"
            onClick={() => setCreateOpen(true)}
          >
            {CD_VORHABEN_WORKSPACE_COPY.createTaskAction}
          </button>
        ) : null}
      </div>

      {showCreatedBanner ? (
        <div className="mb-4 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
          Ziel gespeichert.{" "}
          {canCreate ? (
            <button
              type="button"
              className="font-semibold underline"
              onClick={() => setCreateOpen(true)}
            >
              {CD_TARGET_COPY.createTaskAfterZielAction}
            </button>
          ) : null}
        </div>
      ) : null}

      {canCreate ? (
        <div className="mb-4" data-sce-contextual-create-flow="inline-collapsible">
          <VereinsentwicklungAufgabeWorkspaceCreateCard
            canCreate
            expanded={createOpen}
            onExpandedChange={setCreateOpen}
            hideToolbarTrigger
            initialTargetId={targetId}
            initialTargetTitle={targetTitle}
            onCreated={() => router.refresh()}
          />
        </div>
      ) : null}

      {tasks.length === 0 ? (
        <p className="text-sm text-[var(--muted)] italic" data-testid="target-aufgaben-empty">
          {CD_TARGET_COPY.aufgabenEmpty}
        </p>
      ) : (
        <ul className="space-y-2" data-testid="target-aufgaben-list">
          {tasks.map((task) => (
            <li
              key={task.id}
              className="grid gap-2 rounded-lg border border-[var(--border)] px-3 py-2 sm:grid-cols-[minmax(0,1.4fr)_minmax(0,0.7fr)_minmax(0,0.9fr)] sm:items-center"
            >
              <Link href={task.href} className="text-sm font-medium text-[var(--sce-primary)] hover:underline">
                {task.title}
              </Link>
              <span className="text-xs text-[var(--text-2)]">{task.statusLabel}</span>
              <span className="text-xs text-[var(--text-2)]">
                {task.responsibleLabel?.trim() || "Nicht zugewiesen"}
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}