"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { ArrowLeft } from "lucide-react";
import type { RequirementAggregateDto, RequirementDto } from "@/lib/requirements/types";
import type { RequirementPersonOption } from "@/lib/requirements/person-search";
import type {
  RequirementAudienceOriginLabels,
  RequirementRecipientMatrixRow,
} from "@/lib/requirements/management-service";
import {
  formatRequirementReminderSummary,
  REQUIREMENT_STATUS_LABELS,
} from "@/lib/requirements/presentation";
import RequirementAudienceOriginPanel from "./RequirementAudienceOriginPanel";
import RequirementRecipientDetailDrawer from "./RequirementRecipientDetailDrawer";
import RequirementRecipientStatusLabel from "./RequirementRecipientStatusLabel";
import TaskDescriptionFormField from "./TaskDescriptionFormField";
import TaskDescriptionContent from "./TaskDescriptionContent";
import RequirementAudienceBuilder from "./RequirementAudienceBuilder";
import { TaskReminderFields } from "./TaskReminderFields";
import type { RequirementAudienceSelection } from "@/lib/requirements/types";
import {
  activateRequirementAction,
  cancelRequirementAction,
  closeRequirementAction,
  updateRequirementDraftAction,
} from "@/app/(admin)/dashboard/aufgaben/requirement-actions";
import type { RequirementDocumentReferenceDto } from "@/lib/requirements/requirement-document-reference-service";
import { RequirementDocumentReferencesSection } from "./RequirementDocumentReferencesSection";
import { buildAufgabenBereichHref } from "@/lib/personal-actions/aufgaben-scope";

type Props = {
  requirement: RequirementDto;
  aggregate: RequirementAggregateDto | null;
  audienceKnown: RequirementPersonOption[];
  audienceKnownLabels: {
    teams: { teamId: string; label: string }[];
    orgUnits: { orgUnitId: string; label: string }[];
    roles: { roleId: string; label: string }[];
    targetGroups: { targetGroupId: string; label: string }[];
  } | null;
  audienceOriginLabels: RequirementAudienceOriginLabels | null;
  matrixRows: RequirementRecipientMatrixRow[];
  matrixTotalCount: number;
  matrixPage: number;
  matrixPageCount: number;
  canManage: boolean;
  canViewMatrix: boolean;
  documentReferences: RequirementDocumentReferenceDto[];
  canLinkDocuments: boolean;
  creatorLabel: string | null;
  locale: string;
  timeZone: string;
};

function formatDateTime(iso: string | null, locale: string, timeZone: string): string {
  if (!iso) return "—";
  return new Intl.DateTimeFormat(locale, {
    timeZone,
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));
}

export default function RequirementDetailWorkspace({
  requirement,
  aggregate,
  audienceKnown,
  audienceKnownLabels,
  audienceOriginLabels,
  matrixRows,
  matrixTotalCount,
  matrixPage,
  matrixPageCount,
  canManage,
  canViewMatrix,
  documentReferences,
  canLinkDocuments,
  creatorLabel,
  locale,
  timeZone,
}: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [audience, setAudience] = useState<RequirementAudienceSelection>({
    personIds: requirement.draftAudiencePersonIds,
    teamIds: requirement.draftAudienceTeamIds,
    orgUnitIds: requirement.draftAudienceOrgUnitIds,
    roleIds: requirement.draftAudienceRoleIds,
    targetGroupIds: requirement.draftAudienceTargetGroupIds,
  });
  const audienceKnownLabelMaps = useMemo(
    () => ({
      teams: Object.fromEntries(audienceKnownLabels?.teams.map((t) => [t.teamId, t.label]) ?? []),
      orgUnits: Object.fromEntries(
        audienceKnownLabels?.orgUnits.map((o) => [o.orgUnitId, o.label]) ?? [],
      ),
      roles: Object.fromEntries(audienceKnownLabels?.roles.map((r) => [r.roleId, r.label]) ?? []),
      targetGroups: Object.fromEntries(
        audienceKnownLabels?.targetGroups.map((g) => [g.targetGroupId, g.label]) ?? [],
      ),
    }),
    [audienceKnownLabels],
  );
  const hasAnyAudience =
    audience.personIds.length +
      audience.teamIds.length +
      audience.orgUnitIds.length +
      audience.roleIds.length +
      audience.targetGroupIds.length >
    0;
  const [publishOpen, setPublishOpen] = useState(false);
  const [closeOpen, setCloseOpen] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [selectedRecipient, setSelectedRecipient] = useState<RequirementRecipientMatrixRow | null>(
    null,
  );

  const matrixFilter = (searchParams.get("matrix") ?? "ALL").toUpperCase();
  const matrixSearch = searchParams.get("mq") ?? "";

  const isDraft = requirement.status === "DRAFT";
  const isActive = requirement.status === "ACTIVE";
  const readOnly = requirement.status === "CLOSED" || requirement.status === "CANCELLED";

  const backHref = buildAufgabenBereichHref("anforderungen");

  const reminderSummary = formatRequirementReminderSummary({
    remindersConfigured: requirement.remindersConfigured,
    reminder1At: requirement.reminder1At,
    reminder2At: requirement.reminder2At,
    locale,
    timeZone,
  });

  const matrixFilterHref = useMemo(() => {
    return (filter: string) => {
      const params = new URLSearchParams(searchParams.toString());
      params.set("matrix", filter);
      params.delete("mp");
      return `?${params.toString()}`;
    };
  }, [searchParams]);

  function onSaveDraft(formData: FormData) {
    setError(null);
    formData.set("audiencePersonIds", audience.personIds.join(","));
    formData.set("audienceTeamIds", audience.teamIds.join(","));
    formData.set("audienceOrgUnitIds", audience.orgUnitIds.join(","));
    formData.set("audienceRoleIds", audience.roleIds.join(","));
    formData.set("audienceTargetGroupIds", audience.targetGroupIds.join(","));
    startTransition(async () => {
      const result = await updateRequirementDraftAction(requirement.id, formData);
      if (!result.ok) {
        setError(result.message);
        return;
      }
      router.refresh();
    });
  }

  function onPublish() {
    setError(null);
    startTransition(async () => {
      const formEl = document.getElementById("requirement-draft-form") as HTMLFormElement | null;
      if (formEl) {
        const formData = new FormData(formEl);
        formData.set("audiencePersonIds", audience.personIds.join(","));
    formData.set("audienceTeamIds", audience.teamIds.join(","));
    formData.set("audienceOrgUnitIds", audience.orgUnitIds.join(","));
    formData.set("audienceRoleIds", audience.roleIds.join(","));
    formData.set("audienceTargetGroupIds", audience.targetGroupIds.join(","));
        const saveResult = await updateRequirementDraftAction(requirement.id, formData);
        if (!saveResult.ok) {
          setError(saveResult.message);
          return;
        }
      }
      const result = await activateRequirementAction(requirement.id);
      if (!result.ok) {
        setError(result.message);
        return;
      }
      setPublishOpen(false);
      router.refresh();
    });
  }

  function onClose() {
    startTransition(async () => {
      const result = await closeRequirementAction(requirement.id);
      if (!result.ok) setError(result.message);
      else {
        setCloseOpen(false);
        router.refresh();
      }
    });
  }

  function onCancel() {
    startTransition(async () => {
      const result = await cancelRequirementAction(requirement.id);
      if (!result.ok) setError(result.message);
      else {
        setCancelOpen(false);
        router.refresh();
      }
    });
  }

  return (
    <div className="space-y-6" data-testid="requirement-detail-workspace">
      <div className="flex flex-wrap items-center gap-3">
        <Link
          href={backHref}
          className="inline-flex items-center gap-1 text-sm text-[var(--text-2)] hover:text-[var(--foreground)]"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Anforderungen
        </Link>
      </div>

      <header
        className="space-y-3 border-b border-[var(--border)] pb-4"
        data-testid="requirement-detail-header"
      >
        <div className="flex flex-wrap items-start justify-between gap-3">
          <h1 className="text-xl font-semibold text-[var(--foreground)]">{requirement.title}</h1>
          <span className="inline-flex rounded-full border border-[var(--border)] px-2.5 py-0.5 text-xs font-medium text-[var(--text-2)]">
            {REQUIREMENT_STATUS_LABELS[requirement.status]}
          </span>
        </div>
        <dl className="flex flex-wrap gap-x-6 gap-y-2 text-sm">
          <div>
            <dt className="text-[0.6875rem] font-semibold uppercase tracking-wide text-[var(--muted)]">
              Erstellt von
            </dt>
            <dd className="text-[var(--text-2)]">{creatorLabel ?? "Ersteller nicht verfügbar"}</dd>
          </div>
          <div>
            <dt className="text-[0.6875rem] font-semibold uppercase tracking-wide text-[var(--muted)]">
              Erstellt am
            </dt>
            <dd className="text-[var(--text-2)]">
              {formatDateTime(requirement.createdAt, locale, timeZone).split(",")[0]}
            </dd>
          </div>
          <div>
            <dt className="text-[0.6875rem] font-semibold uppercase tracking-wide text-[var(--muted)]">
              Fällig
            </dt>
            <dd className="text-[var(--text-2)]">
              {requirement.dueAt
                ? formatDateTime(requirement.dueAt, locale, timeZone).split(",")[0]
                : "—"}
            </dd>
          </div>
          {reminderSummary ? (
            <div>
              <dt className="text-[0.6875rem] font-semibold uppercase tracking-wide text-[var(--muted)]">
                Erinnerungen
              </dt>
              <dd className="text-[var(--text-2)]">{reminderSummary}</dd>
            </div>
          ) : null}
          {aggregate ? (
            <>
              <div>
                <dt className="text-[0.6875rem] font-semibold uppercase tracking-wide text-[var(--muted)]">
                  Empfänger
                </dt>
                <dd className="tabular-nums text-[var(--text-2)]">{aggregate.totalRecipients}</dd>
              </div>
              <div>
                <dt className="text-[0.6875rem] font-semibold uppercase tracking-wide text-[var(--muted)]">
                  Erledigt
                </dt>
                <dd className="tabular-nums text-[var(--text-2)]">
                  {aggregate.resolvedCount} / {aggregate.totalRecipients} · {aggregate.resolvedPercent}{" "}
                  %
                </dd>
              </div>
            </>
          ) : null}
        </dl>
      </header>

      {error ? (
        <p className="text-sm text-red-600" role="alert">
          {error}
        </p>
      ) : null}

      {isDraft ? (
        <form id="requirement-draft-form" action={onSaveDraft} className="space-y-4">
          <label className="block space-y-1">
            <span className="text-xs font-medium text-[var(--text-2)]">Titel</span>
            <input
              name="title"
              required
              defaultValue={requirement.title}
              disabled={!canManage || pending}
              className="w-full rounded-md border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2 text-sm"
              data-testid="requirement-draft-title"
            />
          </label>
          <TaskDescriptionFormField
            name="description"
            initialStored={requirement.description}
            disabled={!canManage || pending}
            compact
          />
          <RequirementDocumentReferencesSection
            requirementId={requirement.id}
            references={documentReferences}
            canLink={canLinkDocuments}
          />
          <div className="grid gap-4 md:grid-cols-2">
            <label className="block space-y-1">
              <span className="text-xs font-medium text-[var(--text-2)]">Fällig am</span>
              <input
                type="date"
                name="dueAt"
                defaultValue={requirement.dueAt?.slice(0, 10) ?? ""}
                disabled={!canManage || pending}
                className="w-full rounded-md border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2 text-sm"
              />
            </label>
            <TaskReminderFields
              timeZone={timeZone}
              disabled={!canManage || pending}
              values={{
                reminder1PresetKey: requirement.reminder1PresetKey,
                reminder2PresetKey: requirement.reminder2PresetKey,
                reminder1At: requirement.reminder1At,
                reminder2At: requirement.reminder2At,
              }}
            />
          </div>
          <RequirementAudienceBuilder
            value={audience}
            onChange={setAudience}
            disabled={!canManage || pending}
            knownLabels={audienceKnownLabelMaps}
            initialKnownPersons={audienceKnown}
          />
          {canManage ? (
            <div className="flex flex-wrap gap-2">
              <button type="submit" className="fca-button-secondary text-sm" disabled={pending}>
                Speichern
              </button>
              <button
                type="button"
                className="fca-button-primary text-sm"
                disabled={pending || !hasAnyAudience}
                onClick={() => setPublishOpen(true)}
                data-testid="requirement-publish-open"
              >
                Veröffentlichen
              </button>
            </div>
          ) : null}
          <p className="text-xs text-[var(--muted)]" data-testid="requirement-draft-audience-hint">
            {hasAnyAudience
              ? "Empfänger werden beim Veröffentlichen festgelegt."
              : "Noch keine Empfänger festgelegt. Empfänger werden beim Aktivieren festgelegt."}
          </p>
        </form>
      ) : (
        <>
          {requirement.description ? (
            <section className="prose prose-sm max-w-none text-[var(--foreground)]">
              <TaskDescriptionContent description={requirement.description} />
            </section>
          ) : null}

          <RequirementDocumentReferencesSection
            requirementId={requirement.id}
            references={documentReferences}
            canLink={canLinkDocuments}
          />

          {aggregate ? (
            <section className="space-y-3" data-testid="requirement-progress-block">
              <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm">
                <p>
                  <span className="font-semibold tabular-nums text-[var(--foreground)]">
                    {aggregate.totalRecipients}
                  </span>{" "}
                  <span className="text-[var(--muted)]">Empfänger</span>
                </p>
                <p>
                  <span className="font-semibold tabular-nums text-emerald-600 dark:text-emerald-400">
                    {aggregate.resolvedCount}
                  </span>{" "}
                  <span className="text-[var(--muted)]">Erledigt</span>
                </p>
                <p>
                  <span className="font-semibold tabular-nums text-[var(--foreground)]">
                    {aggregate.openCount}
                  </span>{" "}
                  <span className="text-[var(--muted)]">Offen</span>
                </p>
                <p>
                  <span className="font-semibold tabular-nums text-red-600 dark:text-red-400">
                    {aggregate.overdueCount}
                  </span>{" "}
                  <span className="text-[var(--muted)]">Überfällig</span>
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <div
                  className="h-2 min-w-[12rem] flex-1 max-w-xl overflow-hidden rounded-full bg-[var(--surface-2)]"
                  role="progressbar"
                  aria-valuenow={aggregate.resolvedPercent}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-label={`Fortschritt ${aggregate.resolvedPercent} Prozent`}
                >
                  <div
                    className="h-full rounded-full bg-[var(--accent)]"
                    style={{ width: `${aggregate.resolvedPercent}%` }}
                  />
                </div>
                <p className="text-sm font-medium tabular-nums text-[var(--foreground)]">
                  {aggregate.resolvedPercent} %
                </p>
              </div>
            </section>
          ) : null}

          {audienceOriginLabels ? (
            <RequirementAudienceOriginPanel
              labels={audienceOriginLabels}
              snapshotRecipientCount={aggregate?.totalRecipients ?? 0}
            />
          ) : null}

          {canManage && isActive ? (
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                className="fca-button-secondary text-sm"
                onClick={() => setCloseOpen(true)}
                data-testid="requirement-close-open"
              >
                Abschliessen
              </button>
              <button
                type="button"
                className="text-sm text-[var(--text-2)] underline-offset-2 hover:underline"
                onClick={() => setCancelOpen(true)}
                data-testid="requirement-cancel-open"
              >
                Abbrechen
              </button>
            </div>
          ) : null}
        </>
      )}

      {canViewMatrix && !isDraft ? (
        <section className="space-y-3" data-testid="requirement-recipient-matrix">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-sm font-semibold text-[var(--foreground)]">Empfänger</h2>
            <div className="flex flex-wrap gap-1 text-xs">
              {[
                ["ALL", "Alle"],
                ["OPEN", "Offen"],
                ["ACKNOWLEDGED", "Erledigt"],
                ["OVERDUE", "Überfällig"],
              ].map(([id, label]) => (
                <Link
                  key={id}
                  href={matrixFilterHref(id)}
                  className={
                    matrixFilter === id
                      ? "rounded-md bg-[var(--surface-2)] px-2 py-1 font-medium"
                      : "rounded-md px-2 py-1 text-[var(--text-2)] hover:bg-[var(--surface-2)]/60"
                  }
                  data-testid={`requirement-matrix-filter-${id.toLowerCase()}`}
                >
                  {label}
                </Link>
              ))}
            </div>
          </div>
          <input
            type="search"
            defaultValue={matrixSearch}
            placeholder="Person suchen…"
            className="w-full max-w-sm rounded-md border border-[var(--border)] px-2 py-1.5 text-sm"
            data-testid="requirement-matrix-search"
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                const params = new URLSearchParams(searchParams.toString());
                params.set("mq", (e.target as HTMLInputElement).value.trim());
                params.delete("mp");
                router.push(`?${params.toString()}`);
              }
            }}
          />
          <div className="overflow-x-auto rounded-lg border border-[var(--border)]">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead className="border-b border-[var(--border)] bg-[var(--surface-2)]/40 text-xs text-[var(--muted)]">
                <tr>
                  <th className="px-3 py-2 font-medium">Person</th>
                  <th className="px-3 py-2 font-medium">Status</th>
                  <th className="hidden px-3 py-2 font-medium sm:table-cell">Erledigt am</th>
                  <th className="hidden px-3 py-2 font-medium md:table-cell">Fällig</th>
                  <th className="px-3 py-2 font-medium text-right">Aktion</th>
                </tr>
              </thead>
              <tbody>
                {matrixTotalCount === 0 && matrixFilter === "ALL" && !matrixSearch ? (
                  <tr>
                    <td colSpan={5} className="px-3 py-6 text-center text-sm text-[var(--muted)]">
                      Keine Empfänger in dieser Anforderung.
                    </td>
                  </tr>
                ) : matrixRows.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-3 py-6 text-center text-sm text-[var(--muted)]">
                      Keine Empfänger entsprechen den Filtern.
                    </td>
                  </tr>
                ) : (
                  matrixRows.map((row) => (
                    <tr key={row.id} className="border-b border-[var(--border)]/70 last:border-0">
                      <td className="px-3 py-2 font-medium text-[var(--foreground)]">
                        {row.subjectDisplayName}
                      </td>
                      <td className="px-3 py-2">
                        <RequirementRecipientStatusLabel status={row.managementStatus} />
                      </td>
                      <td className="hidden px-3 py-2 sm:table-cell text-[var(--text-2)]">
                        {formatDateTime(row.respondedAt, locale, timeZone)}
                      </td>
                      <td className="hidden px-3 py-2 md:table-cell text-[var(--text-2)]">
                        {row.dueAt
                          ? formatDateTime(row.dueAt, locale, timeZone).split(",")[0]
                          : "—"}
                      </td>
                      <td className="px-3 py-2 text-right">
                        <button
                          type="button"
                          className="text-xs font-medium text-[var(--link)] hover:underline"
                          onClick={() => setSelectedRecipient(row)}
                          data-testid={`requirement-recipient-detail-${row.id}`}
                        >
                          Details
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          {matrixPageCount > 1 ? (
            <nav className="flex flex-wrap items-center justify-between gap-2 text-xs text-[var(--muted)]">
              <span>
                Seite {matrixPage} / {matrixPageCount} ({matrixTotalCount} Empfänger)
              </span>
              <div className="flex gap-2">
                {matrixPage > 1 ? (
                  <Link
                    href={`?${new URLSearchParams({
                      ...Object.fromEntries(searchParams.entries()),
                      mp: String(matrixPage - 1),
                    }).toString()}`}
                    className="rounded border border-[var(--border)] px-2 py-1 hover:bg-[var(--surface-2)]"
                  >
                    Zurück
                  </Link>
                ) : null}
                {matrixPage < matrixPageCount ? (
                  <Link
                    href={`?${new URLSearchParams({
                      ...Object.fromEntries(searchParams.entries()),
                      mp: String(matrixPage + 1),
                    }).toString()}`}
                    className="rounded border border-[var(--border)] px-2 py-1 hover:bg-[var(--surface-2)]"
                  >
                    Weiter
                  </Link>
                ) : null}
              </div>
            </nav>
          ) : null}
        </section>
      ) : null}

      {selectedRecipient ? (
        <RequirementRecipientDetailDrawer
          row={selectedRecipient}
          requirementTitle={requirement.title}
          locale={locale}
          timeZone={timeZone}
          onClose={() => setSelectedRecipient(null)}
        />
      ) : null}

      {publishOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div
            role="dialog"
            aria-modal="true"
            className="w-full max-w-md rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4 shadow-xl"
            data-testid="requirement-publish-dialog"
          >
            <h2 className="text-base font-semibold">Anforderung veröffentlichen?</h2>
            <p className="mt-2 text-sm text-[var(--text-2)]">
              Die ausgewählten Empfänger werden beim Veröffentlichen als Snapshot übernommen. Die
              Empfängerliste kann danach nicht mehr direkt geändert werden.
            </p>
            <div className="mt-4 flex justify-end gap-2">
              <button type="button" className="fca-button-secondary text-sm" onClick={() => setPublishOpen(false)}>
                Abbrechen
              </button>
              <button
                type="button"
                className="fca-button-primary text-sm"
                onClick={onPublish}
                disabled={pending}
                data-testid="requirement-publish-confirm"
              >
                Veröffentlichen
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {closeOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div role="dialog" aria-modal="true" className="w-full max-w-md rounded-xl border bg-[var(--surface)] p-4">
            <h2 className="text-base font-semibold">Anforderung abschliessen?</h2>
            <p className="mt-2 text-sm text-[var(--text-2)]">
              Offene Rückmeldungen bleiben als offen dokumentiert. Danach sind keine weiteren
              Bestätigungen möglich.
            </p>
            <div className="mt-4 flex justify-end gap-2">
              <button type="button" className="fca-button-secondary text-sm" onClick={() => setCloseOpen(false)}>
                Abbrechen
              </button>
              <button type="button" className="fca-button-primary text-sm" onClick={onClose} disabled={pending}>
                Abschliessen
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {cancelOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div role="dialog" aria-modal="true" className="w-full max-w-md rounded-xl border bg-[var(--surface)] p-4">
            <h2 className="text-base font-semibold">Anforderung abbrechen?</h2>
            <p className="mt-2 text-sm text-[var(--text-2)]">
              Die Anforderung wird beendet. Bereits erfolgte Bestätigungen bleiben dokumentiert.
            </p>
            <div className="mt-4 flex justify-end gap-2">
              <button type="button" className="fca-button-secondary text-sm" onClick={() => setCancelOpen(false)}>
                Zurück
              </button>
              <button type="button" className="fca-button-primary text-sm" onClick={onCancel} disabled={pending}>
                Abbrechen
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {readOnly ? (
        <p className="text-xs text-[var(--muted)]">
          Diese Anforderung ist abgeschlossen — keine weiteren Änderungen möglich.
        </p>
      ) : null}
    </div>
  );
}
