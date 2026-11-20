import Link from "next/link";
import type { TargetConnectedTaskRow } from "@/lib/club-development/target-connected-tasks";
import { CD_VORHABEN_WORKSPACE_COPY, CD_TARGET_COPY } from "@/lib/club-development/product-copy";
import { buildVereinsentwicklungTargetTaskCreateHref } from "@/lib/club-development/vereinsentwicklung-target-task-create-routing";
import { VEREINSLEITUNG_PANEL_CLASS } from "@/components/admin/vereinsleitung/vereinsleitungSurfaceStyles";

type Props = {
  targetId: string;
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
  tasks,
  canCreate,
  returnTo,
  orgUnitId = null,
  showCreatedBanner = false,
  deliveryProgressCaption = null,
  deliveryProgressPercent = null,
}: Props) {
  const createHref = buildVereinsentwicklungTargetTaskCreateHref({
    targetId,
    returnTo,
    orgUnitId,
  });

  return (
    <section className={VEREINSLEITUNG_PANEL_CLASS} data-testid="target-aufgaben-section">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 className="text-[13px] font-semibold uppercase tracking-[0.12em] text-[var(--text-2)]">
            Aufgaben
          </h3>
          {deliveryProgressCaption ? (
            <p className="mt-1 text-xs text-[var(--text-2)]" data-testid="target-delivery-progress-caption">
              Umsetzungsfortschritt: {deliveryProgressCaption}
              {deliveryProgressCaption !== "Noch keine Aufgaben" && deliveryProgressPercent != null ? (
                <span className="ml-1 tabular-nums">({deliveryProgressPercent}%)</span>
              ) : null}
            </p>
          ) : null}
        </div>
        {canCreate ? (
          <Link
            href={createHref}
            className="inline-flex items-center rounded-lg bg-[var(--sce-primary)] px-3 py-1.5 text-sm font-medium text-white hover:opacity-95"
            data-testid="target-aufgabe-erstellen"
            data-sce-contextual-create-flow="full-page"
          >
            {CD_VORHABEN_WORKSPACE_COPY.createTaskAction}
          </Link>
        ) : null}
      </div>

      {showCreatedBanner ? (
        <div className="mb-4 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
          Ziel gespeichert.{" "}
          {canCreate ? (
            <Link href={createHref} className="font-semibold underline">
              {CD_TARGET_COPY.createTaskAfterZielAction}
            </Link>
          ) : null}
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