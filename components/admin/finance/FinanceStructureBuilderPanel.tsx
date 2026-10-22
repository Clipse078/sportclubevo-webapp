"use client";

import { useMemo, useState, useTransition, useId } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { CircleDot, FolderTree, Plus } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import { SceFormField } from "@/components/sce/forms/SceFormField";
import { cn } from "@/lib/cn";
import { SCE_DENSE_ROW_INTERACTIVE_CLASS } from "@/lib/design-system/sce-dense-ui-micro-ux";
import { SCE_DIALOG_ACTIONS_ROW_CLASS } from "@/lib/design-system/sce-action-dialog-micro-ux";
import type { FinanceStructureTreeNode } from "@/lib/finance/structure/build-structure-tree";
import { FINANCE_STRUCTURE_ACCOUNT_SEMANTICS } from "@/lib/finance/structure/structure-presentation";
import { FINANCE_STRUCTURE_TEMPLATE_REGISTRY } from "@/lib/finance/structure/template-registry";
import {
  applyStructureTemplateAction,
  createFinancialAccountAction,
  createReportingGroupAction,
} from "@/app/(admin)/dashboard/finance/structure/actions";
import type { CanonicalAccountSemantic } from "@prisma/client";
import type { FinanceStructureActionResult } from "@/app/(admin)/dashboard/finance/structure/actions";
import {
  AccountRowActions,
  ReportingGroupRowActions,
} from "@/components/admin/finance/FinanceStructureNodeActions";

type GroupOption = { id: string; name: string; depth: number };

type StructureMutationHandlers = {
  onMutated: () => void;
  onActionFeedback: (message: string) => void;
  onAddSubgroup: (parentGroupId: string) => void;
  onAddAccount: (reportingGroupId: string) => void;
};

const FIELD_CONTROL_CLASS =
  "w-full rounded-md border border-[var(--sce-color-border-standard)] px-3 py-2 text-sm";

function runStructureMutation(
  startTransition: (fn: () => void) => void,
  handlers: StructureMutationHandlers,
  fn: () => Promise<FinanceStructureActionResult>,
) {
  startTransition(async () => {
    const result = await fn();
    if (result.ok) {
      handlers.onMutated();
    } else {
      handlers.onActionFeedback(result.error);
    }
  });
}

type FinanceStructureBuilderPanelProps = {
  tree: FinanceStructureTreeNode[];
  isEmpty: boolean;
  canMutate: boolean;
  appliedTemplateKey: string | null;
  groupOptions: GroupOption[];
};

function flattenGroupOptions(
  nodes: FinanceStructureTreeNode[],
  depth = 0,
): GroupOption[] {
  const options: GroupOption[] = [];
  for (const node of nodes) {
    if (node.type !== "group") continue;
    options.push({ id: node.id, name: node.name, depth });
    options.push(...flattenGroupOptions(node.children, depth + 1));
  }
  return options;
}

function StructureTreeRows(props: {
  nodes: FinanceStructureTreeNode[];
  depth?: number;
  canMutate: boolean;
  groupOptions: GroupOption[];
  mutationHandlers: StructureMutationHandlers;
}) {
  const t = useTranslations("Finance.structure");
  const depth = props.depth ?? 0;

  return (
    <ul
      className={cn(depth > 0 && "ms-2 border-s border-[var(--border)]/80 ps-2")}
      role="group"
    >
      {props.nodes.map((node) => {
        if (node.type === "group") {
          const archived = node.lifecycle === "ARCHIVED";
          return (
            <li key={node.id} role="treeitem" aria-expanded="true" aria-selected={false} className="min-w-0">
              <div
                className={cn(
                  "group/row flex min-w-0 items-center gap-2 rounded-md py-1.5 pe-1 ps-1",
                  SCE_DENSE_ROW_INTERACTIVE_CLASS,
                  archived && "opacity-75",
                )}
              >
                <span
                  className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-[var(--surface-2)] text-[var(--sce-primary)]"
                  aria-hidden="true"
                >
                  <FolderTree className="h-4 w-4" strokeWidth={2} />
                </span>
                <span className="min-w-0 flex-1 truncate text-sm font-semibold text-[var(--foreground)]">
                  {node.name}
                </span>
                {archived ? (
                  <span
                    className="shrink-0 rounded-md bg-[var(--surface-2)] px-1.5 py-0.5 text-[0.6875rem] font-medium text-[var(--muted)]"
                    title={t("archivedHint")}
                  >
                    {t("archivedBadge")}
                  </span>
                ) : null}
                {props.canMutate ? (
                  <ReportingGroupRowActions
                    node={node}
                    groupOptions={props.groupOptions}
                    mutationHandlers={props.mutationHandlers}
                  />
                ) : null}
              </div>
              {node.children.length === 0 && props.canMutate && !archived ? (
                <p
                  className="py-1 ps-10 text-xs text-[var(--muted)]"
                  data-testid="empty-reporting-group-nudge"
                >
                  {t("emptyGroupHint")}
                </p>
              ) : null}
              {node.children.length > 0 ? (
                <StructureTreeRows
                  nodes={node.children}
                  depth={depth + 1}
                  canMutate={props.canMutate}
                  groupOptions={props.groupOptions}
                  mutationHandlers={props.mutationHandlers}
                />
              ) : null}
            </li>
          );
        }

        const archived = node.lifecycle === "ARCHIVED";
        return (
          <li key={node.id} role="treeitem" aria-selected={false} className="min-w-0">
            <div
              className={cn(
                "group/row flex min-w-0 items-center gap-2 rounded-md py-1.5 pe-1 ps-1",
                SCE_DENSE_ROW_INTERACTIVE_CLASS,
                archived && "opacity-75",
              )}
            >
              <span
                className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-[var(--muted)]"
                aria-hidden="true"
              >
                <CircleDot className="h-4 w-4" strokeWidth={2} />
              </span>
              <span className="min-w-0 flex-1 truncate text-sm text-[var(--foreground)]">{node.name}</span>
              <span
                className="hidden shrink-0 text-xs text-[var(--muted)] sm:inline"
                data-testid="account-semantic-meta"
              >
                {t(`semantics.${node.canonicalSemantic.toLowerCase()}.label` as "semantics.income.label")}
              </span>
              {archived ? (
                <span
                  className="shrink-0 rounded-md bg-[var(--surface-2)] px-1.5 py-0.5 text-[0.6875rem] font-medium text-[var(--muted)]"
                  title={t("archivedHint")}
                >
                  {t("archivedBadge")}
                </span>
              ) : null}
              {props.canMutate ? (
                <AccountRowActions
                  node={node}
                  groupOptions={props.groupOptions}
                  mutationHandlers={props.mutationHandlers}
                />
              ) : null}
            </div>
          </li>
        );
      })}
    </ul>
  );
}

export function FinanceStructureBuilderPanel({
  tree,
  isEmpty,
  canMutate,
  appliedTemplateKey,
  groupOptions: initialGroupOptions,
}: FinanceStructureBuilderPanelProps) {
  const t = useTranslations("Finance");
  const ts = useTranslations("Finance.structure");
  const [pending, startTransition] = useTransition();
  const router = useRouter();
  const [createGroupOpen, setCreateGroupOpen] = useState(false);
  const [createAccountOpen, setCreateAccountOpen] = useState(false);
  const [templatePreviewOpen, setTemplatePreviewOpen] = useState(false);
  const [createGroupParentPreset, setCreateGroupParentPreset] = useState<string>("");
  const [createAccountGroupPreset, setCreateAccountGroupPreset] = useState<string>("");
  const [actionFeedback, setActionFeedback] = useState<string | null>(null);
  const createGroupNameId = useId();
  const createGroupParentId = useId();
  const createAccountNameId = useId();
  const createAccountGroupId = useId();
  const createAccountSemanticId = useId();

  const groupOptions = useMemo(
    () => (initialGroupOptions.length > 0 ? initialGroupOptions : flattenGroupOptions(tree)),
    [initialGroupOptions, tree],
  );

  const defaultTemplate = FINANCE_STRUCTURE_TEMPLATE_REGISTRY[0];

  const mutationHandlers: StructureMutationHandlers = {
    onMutated: () => {
      setActionFeedback(null);
      router.refresh();
    },
    onActionFeedback: (message) => setActionFeedback(message),
    onAddSubgroup: (parentGroupId) => {
      setCreateGroupParentPreset(parentGroupId);
      setCreateGroupOpen(true);
    },
    onAddAccount: (reportingGroupId) => {
      setCreateAccountGroupPreset(reportingGroupId);
      setCreateAccountOpen(true);
    },
  };

  const openCreateRootGroup = () => {
    setCreateGroupParentPreset("");
    setCreateGroupOpen(true);
  };

  return (
    <div className="space-y-6" data-finance-structure-panel>
      {!canMutate ? (
        <p className="text-sm text-[var(--muted)]" data-testid="structure-view-only-hint">
          {ts("viewOnlyHint")}
        </p>
      ) : null}

      {actionFeedback ? (
        <div
          className="rounded-lg border border-amber-500/30 bg-amber-500/5 px-4 py-3 text-sm text-[var(--foreground)]"
          role="status"
          data-testid="structure-action-feedback"
        >
          <p className="font-medium">{ts("actionBlockedTitle")}</p>
          <p className="mt-1 text-[var(--muted)]">{actionFeedback}</p>
        </div>
      ) : null}

      {appliedTemplateKey && !isEmpty && canMutate ? (
        <p className="text-sm text-[var(--muted)]" data-testid="template-applied-nudge">
          {ts("templateAppliedNextSteps")}
        </p>
      ) : null}

      {isEmpty ? (
        <section
          className="rounded-xl border border-[var(--sce-color-border-standard)] p-5"
          data-testid="structure-empty-state"
        >
          <h2 className="text-sm font-semibold">{ts("emptyTitle")}</h2>
          <p className="mt-1 text-sm text-[var(--muted)]">{ts("emptyBody")}</p>
          {canMutate && !appliedTemplateKey ? (
            <div className="mt-4 space-y-4">
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-[var(--muted)]">
                  {ts("emptyRecommendedLabel")}
                </p>
                <div className="mt-2">
                  <Button type="button" size="sm" onClick={() => setTemplatePreviewOpen(true)}>
                    {ts("previewTemplate")}
                  </Button>
                </div>
              </div>
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-[var(--muted)]">
                  {ts("emptyManualLabel")}
                </p>
                <div className="mt-2">
                  <Button type="button" size="sm" variant="secondary" onClick={openCreateRootGroup}>
                    {ts("createRootGroup")}
                  </Button>
                </div>
              </div>
            </div>
          ) : null}
        </section>
      ) : (
        <>
          {canMutate ? (
            <div className="flex flex-wrap gap-2" data-testid="structure-create-toolbar">
              <Button type="button" size="sm" iconLeft={<Plus className="h-3.5 w-3.5" />} onClick={openCreateRootGroup}>
                {ts("createGroup")}
              </Button>
              <Button
                type="button"
                size="sm"
                variant="secondary"
                iconLeft={<Plus className="h-3.5 w-3.5" />}
                disabled={groupOptions.length === 0}
                onClick={() => {
                  setCreateAccountGroupPreset(groupOptions[0]?.id ?? "");
                  setCreateAccountOpen(true);
                }}
              >
                {ts("createAccount")}
              </Button>
            </div>
          ) : null}
          <section
            className="max-h-[min(32rem,70vh)] overflow-y-auto overflow-x-hidden rounded-xl border border-[var(--sce-color-border-standard)] p-3 sm:p-4"
            aria-label={ts("treeAria")}
          >
            <div role="tree">
              <StructureTreeRows
                nodes={tree}
                canMutate={canMutate}
                groupOptions={groupOptions}
                mutationHandlers={mutationHandlers}
              />
            </div>
          </section>
        </>
      )}

      <Dialog
        open={createGroupOpen}
        onClose={() => !pending && setCreateGroupOpen(false)}
        title={ts("createGroupTitle")}
        footer={
          <div className={SCE_DIALOG_ACTIONS_ROW_CLASS}>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              disabled={pending}
              onClick={() => setCreateGroupOpen(false)}
            >
              {ts("actions.cancel")}
            </Button>
            <Button type="submit" size="sm" disabled={pending} form="create-group-form">
              {ts("actions.create")}
            </Button>
          </div>
        }
      >
        <form
          id="create-group-form"
          key={`create-group-${createGroupParentPreset}`}
          className="space-y-4"
          onSubmit={(event) => {
            event.preventDefault();
            const form = event.currentTarget;
            const data = new FormData(form);
            const name = String(data.get("name") ?? "").trim();
            const parentId = String(data.get("parentId") ?? "");
            runStructureMutation(startTransition, mutationHandlers, async () => {
              const result = await createReportingGroupAction({
                name,
                parentId: parentId === "" ? null : parentId,
              });
              if (result.ok) {
                setCreateGroupOpen(false);
              }
              return result;
            });
          }}
        >
          <SceFormField label={ts("nameLabel")} htmlFor={createGroupNameId} required density="COMPACT">
            <input
              id={createGroupNameId}
              name="name"
              required
              autoFocus
              className={FIELD_CONTROL_CLASS}
              placeholder={ts("nameLabel")}
            />
          </SceFormField>
          <SceFormField label={ts("parentGroupLabel")} htmlFor={createGroupParentId} density="COMPACT">
            <select
              id={createGroupParentId}
              name="parentId"
              defaultValue={createGroupParentPreset}
              className={FIELD_CONTROL_CLASS}
            >
              <option value="">{ts("rootGroupOption")}</option>
              {groupOptions.map((g) => (
                <option key={g.id} value={g.id}>
                  {"—".repeat(g.depth)} {g.name}
                </option>
              ))}
            </select>
          </SceFormField>
        </form>
      </Dialog>

      <Dialog
        open={createAccountOpen}
        onClose={() => !pending && setCreateAccountOpen(false)}
        title={ts("createAccountTitle")}
        footer={
          <div className={SCE_DIALOG_ACTIONS_ROW_CLASS}>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              disabled={pending}
              onClick={() => setCreateAccountOpen(false)}
            >
              {ts("actions.cancel")}
            </Button>
            <Button type="submit" size="sm" disabled={pending} form="create-account-form">
              {ts("actions.create")}
            </Button>
          </div>
        }
      >
        <form
          id="create-account-form"
          key={`create-account-${createAccountGroupPreset}`}
          className="space-y-4"
          onSubmit={(event) => {
            event.preventDefault();
            const data = new FormData(event.currentTarget);
            runStructureMutation(startTransition, mutationHandlers, async () => {
              const result = await createFinancialAccountAction({
                name: String(data.get("name") ?? "").trim(),
                reportingGroupId: String(data.get("reportingGroupId") ?? ""),
                canonicalSemantic: String(data.get("canonicalSemantic") ?? "EXPENSE") as CanonicalAccountSemantic,
              });
              if (result.ok) {
                setCreateAccountOpen(false);
              }
              return result;
            });
          }}
        >
          <SceFormField label={ts("nameLabel")} htmlFor={createAccountNameId} required density="COMPACT">
            <input id={createAccountNameId} name="name" required autoFocus className={FIELD_CONTROL_CLASS} />
          </SceFormField>
          <SceFormField
            label={ts("reportingGroupLabel")}
            htmlFor={createAccountGroupId}
            required
            density="COMPACT"
          >
            <select
              id={createAccountGroupId}
              name="reportingGroupId"
              required
              defaultValue={createAccountGroupPreset || undefined}
              className={FIELD_CONTROL_CLASS}
            >
              {groupOptions.map((g) => (
                <option key={g.id} value={g.id}>
                  {"—".repeat(g.depth)} {g.name}
                </option>
              ))}
            </select>
          </SceFormField>
          <SceFormField label={ts("semanticLabel")} htmlFor={createAccountSemanticId} required density="COMPACT">
            <select
              id={createAccountSemanticId}
              name="canonicalSemantic"
              className={FIELD_CONTROL_CLASS}
              defaultValue="EXPENSE"
            >
              {FINANCE_STRUCTURE_ACCOUNT_SEMANTICS.map((semantic) => (
                <option key={semantic} value={semantic}>
                  {ts(`semantics.${semantic.toLowerCase()}.label`)}
                </option>
              ))}
            </select>
          </SceFormField>
        </form>
      </Dialog>

      {defaultTemplate ? (
        <Dialog
          open={templatePreviewOpen}
          onClose={() => setTemplatePreviewOpen(false)}
          title={t(defaultTemplate.nameKey as Parameters<typeof t>[0])}
          footer={
            <div className={SCE_DIALOG_ACTIONS_ROW_CLASS}>
              <Button
                type="button"
                size="sm"
                variant="secondary"
                disabled={pending}
                onClick={() => setTemplatePreviewOpen(false)}
              >
                {ts("actions.cancel")}
              </Button>
              <Button
                type="button"
                size="sm"
                disabled={pending}
                onClick={() => {
                  runStructureMutation(startTransition, mutationHandlers, async () => {
                    const result = await applyStructureTemplateAction(defaultTemplate.key);
                    if (result.ok) {
                      setTemplatePreviewOpen(false);
                    }
                    return result;
                  });
                }}
              >
                {ts("applyTemplate")}
              </Button>
            </div>
          }
        >
          <p className="text-sm text-[var(--muted)]">
            {t(defaultTemplate.descriptionKey as Parameters<typeof t>[0])}
          </p>
          <p className="mt-2 text-sm">{t(defaultTemplate.previewSummaryKey as Parameters<typeof t>[0])}</p>
          <p className="mt-3 text-sm text-[var(--muted)]" data-testid="template-apply-customize-note">
            {ts("applyTemplateCustomizeNote")}
          </p>
        </Dialog>
      ) : null}
    </div>
  );
}
