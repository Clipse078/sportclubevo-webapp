"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import type { FinanceStructureTreeNode } from "@/lib/finance/structure/build-structure-tree";
import { FINANCE_STRUCTURE_ACCOUNT_SEMANTICS } from "@/lib/finance/structure/structure-presentation";
import { FINANCE_STRUCTURE_TEMPLATE_REGISTRY } from "@/lib/finance/structure/template-registry";
import {
  applyStructureTemplateAction,
  archiveFinancialAccountAction,
  archiveReportingGroupAction,
  createFinancialAccountAction,
  createReportingGroupAction,
  deleteFinancialAccountAction,
  deleteReportingGroupAction,
  moveFinancialAccountAction,
  renameFinancialAccountAction,
  renameReportingGroupAction,
  reactivateFinancialAccountAction,
  reactivateReportingGroupAction,
  reorderFinancialAccountAction,
  reorderReportingGroupAction,
  reparentReportingGroupAction,
} from "@/app/(admin)/dashboard/finance/structure/actions";
import type { CanonicalAccountSemantic } from "@prisma/client";
import type { FinanceStructureActionResult } from "@/app/(admin)/dashboard/finance/structure/actions";

type GroupOption = { id: string; name: string; depth: number };

type StructureMutationHandlers = {
  onMutated: () => void;
  onActionFeedback: (message: string) => void;
  onAddSubgroup: (parentGroupId: string) => void;
  onAddAccount: (reportingGroupId: string) => void;
};

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
    <ul className="space-y-1" role="tree">
      {props.nodes.map((node) => {
        if (node.type === "group") {
          return (
            <li key={node.id} role="treeitem" aria-expanded="true" aria-selected={false}>
              <div
                className="flex flex-wrap items-center gap-2 rounded-md py-1.5 pe-2"
                style={{ paddingInlineStart: `${depth * 1.25}rem` }}
              >
                <span className="text-sm font-medium">{node.name}</span>
                {node.lifecycle === "ARCHIVED" ? (
                  <span className="text-xs text-[var(--muted)]" title={t("archivedHint")}>
                    {t("archivedBadge")}
                  </span>
                ) : null}
                {props.canMutate ? (
                  <GroupActions
                    node={node}
                    groupOptions={props.groupOptions}
                    mutationHandlers={props.mutationHandlers}
                  />
                ) : null}
              </div>
              {node.children.length === 0 && props.canMutate && node.lifecycle !== "ARCHIVED" ? (
                <div
                  className="flex flex-wrap items-center gap-2 py-1 text-xs text-[var(--muted)]"
                  style={{ paddingInlineStart: `${(depth + 1) * 1.25}rem` }}
                  data-testid="empty-reporting-group-nudge"
                >
                  <span>{t("emptyGroupHint")}</span>
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    onClick={() => props.mutationHandlers.onAddSubgroup(node.id)}
                  >
                    {t("actions.addSubgroup")}
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    onClick={() => props.mutationHandlers.onAddAccount(node.id)}
                  >
                    {t("actions.addAccount")}
                  </Button>
                </div>
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

        return (
          <li key={node.id} role="treeitem" aria-selected={false}>
            <div
              className="flex flex-wrap items-center gap-2 rounded-md py-1.5 pe-2"
              style={{ paddingInlineStart: `${depth * 1.25}rem` }}
            >
              <span className="text-sm">{node.name}</span>
              <span className="text-xs text-[var(--muted)]">
                {t(`semantics.${node.canonicalSemantic.toLowerCase()}.label` as "semantics.income.label")}
              </span>
              {node.lifecycle === "ARCHIVED" ? (
                <span className="text-xs text-[var(--muted)]" title={t("archivedHint")}>
                  {t("archivedBadge")}
                </span>
              ) : null}
              {props.canMutate ? (
                <AccountActions
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

function GroupActions(props: {
  node: Extract<FinanceStructureTreeNode, { type: "group" }>;
  groupOptions: GroupOption[];
  mutationHandlers: StructureMutationHandlers;
}) {
  const t = useTranslations("Finance.structure");
  const [renameOpen, setRenameOpen] = useState(false);
  const [moveOpen, setMoveOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  const run = (fn: () => Promise<FinanceStructureActionResult>) => {
    runStructureMutation(startTransition, props.mutationHandlers, fn);
  };

  return (
    <div className="ms-auto flex flex-wrap gap-1">
      <Button type="button" size="sm" variant="ghost" disabled={pending} onClick={() => setRenameOpen(true)}>
        {t("actions.rename")}
      </Button>
      <Button type="button" size="sm" variant="ghost" disabled={pending} onClick={() => setMoveOpen(true)}>
        {t("actions.move")}
      </Button>
      <Button
        type="button"
        size="sm"
        variant="ghost"
        disabled={pending}
        onClick={() =>
          run(async () =>
            props.node.lifecycle === "ARCHIVED"
              ? reactivateReportingGroupAction(props.node.id)
              : archiveReportingGroupAction(props.node.id),
          )
        }
      >
        {props.node.lifecycle === "ARCHIVED" ? t("actions.reactivate") : t("actions.archive")}
      </Button>
      <Button
        type="button"
        size="sm"
        variant="ghost"
        disabled={pending}
        onClick={() => {
          if (!window.confirm(t("confirmDeleteGroup"))) return;
          run(async () => deleteReportingGroupAction(props.node.id));
        }}
      >
        {t("actions.delete")}
      </Button>
      <Button
        type="button"
        size="sm"
        variant="ghost"
        disabled={pending}
        onClick={() =>
          run(async () => reorderReportingGroupAction(props.node.id, Math.max(0, props.node.sortOrder - 1)))
        }
      >
        {t("actions.moveUp")}
      </Button>

      <Dialog open={renameOpen} onClose={() => setRenameOpen(false)} title={t("renameGroupTitle")}>
        <form
          className="space-y-4"
          onSubmit={(event) => {
            event.preventDefault();
            const name = String(new FormData(event.currentTarget).get("name") ?? "").trim();
            run(async () => {
              const result = await renameReportingGroupAction(props.node.id, name);
              if (result.ok) setRenameOpen(false);
              return result;
            });
          }}
        >
          <input
            name="name"
            defaultValue={props.node.name}
            className="w-full rounded-md border border-[var(--sce-color-border-standard)] px-3 py-2 text-sm"
            aria-label={t("nameLabel")}
          />
          <Button type="submit" size="sm" disabled={pending}>
            {t("actions.save")}
          </Button>
        </form>
      </Dialog>

      <Dialog open={moveOpen} onClose={() => setMoveOpen(false)} title={t("moveGroupTitle")}>
        <form
          className="space-y-4"
          onSubmit={(event) => {
            event.preventDefault();
            const parentId = String(new FormData(event.currentTarget).get("parentId") ?? "");
            run(async () => {
              const result = await reparentReportingGroupAction(
                props.node.id,
                parentId === "" ? null : parentId,
              );
              if (result.ok) setMoveOpen(false);
              return result;
            });
          }}
        >
          <select
            name="parentId"
            defaultValue={props.node.parentId ?? ""}
            className="w-full rounded-md border border-[var(--sce-color-border-standard)] px-3 py-2 text-sm"
            aria-label={t("parentGroupLabel")}
          >
            <option value="">{t("rootGroupOption")}</option>
            {props.groupOptions
              .filter((g) => g.id !== props.node.id)
              .map((g) => (
                <option key={g.id} value={g.id}>
                  {"—".repeat(g.depth)} {g.name}
                </option>
              ))}
          </select>
          <Button type="submit" size="sm" disabled={pending}>
            {t("actions.save")}
          </Button>
        </form>
      </Dialog>
    </div>
  );
}

function AccountActions(props: {
  node: Extract<FinanceStructureTreeNode, { type: "account" }>;
  groupOptions: GroupOption[];
  mutationHandlers: StructureMutationHandlers;
}) {
  const t = useTranslations("Finance.structure");
  const [renameOpen, setRenameOpen] = useState(false);
  const [moveOpen, setMoveOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  const run = (fn: () => Promise<FinanceStructureActionResult>) => {
    runStructureMutation(startTransition, props.mutationHandlers, fn);
  };

  return (
    <div className="ms-auto flex flex-wrap gap-1">
      <Button type="button" size="sm" variant="ghost" disabled={pending} onClick={() => setRenameOpen(true)}>
        {t("actions.rename")}
      </Button>
      <Button type="button" size="sm" variant="ghost" disabled={pending} onClick={() => setMoveOpen(true)}>
        {t("actions.move")}
      </Button>
      <Button
        type="button"
        size="sm"
        variant="ghost"
        disabled={pending}
        onClick={() =>
          run(async () =>
            props.node.lifecycle === "ARCHIVED"
              ? reactivateFinancialAccountAction(props.node.id)
              : archiveFinancialAccountAction(props.node.id),
          )
        }
      >
        {props.node.lifecycle === "ARCHIVED" ? t("actions.reactivate") : t("actions.archive")}
      </Button>
      <Button
        type="button"
        size="sm"
        variant="ghost"
        disabled={pending}
        onClick={() => {
          if (!window.confirm(t("confirmDeleteAccount"))) return;
          run(async () => deleteFinancialAccountAction(props.node.id));
        }}
      >
        {t("actions.delete")}
      </Button>
      <Button
        type="button"
        size="sm"
        variant="ghost"
        disabled={pending}
        onClick={() =>
          run(async () => reorderFinancialAccountAction(props.node.id, Math.max(0, props.node.sortOrder - 1)))
        }
      >
        {t("actions.moveUp")}
      </Button>

      <Dialog open={renameOpen} onClose={() => setRenameOpen(false)} title={t("renameAccountTitle")}>
        <form
          className="space-y-4"
          onSubmit={(event) => {
            event.preventDefault();
            const name = String(new FormData(event.currentTarget).get("name") ?? "").trim();
            run(async () => {
              const result = await renameFinancialAccountAction(props.node.id, name);
              if (result.ok) setRenameOpen(false);
              return result;
            });
          }}
        >
          <input
            name="name"
            defaultValue={props.node.name}
            className="w-full rounded-md border border-[var(--sce-color-border-standard)] px-3 py-2 text-sm"
            aria-label={t("nameLabel")}
          />
          <Button type="submit" size="sm" disabled={pending}>
            {t("actions.save")}
          </Button>
        </form>
      </Dialog>

      <Dialog open={moveOpen} onClose={() => setMoveOpen(false)} title={t("moveAccountTitle")}>
        <form
          className="space-y-4"
          onSubmit={(event) => {
            event.preventDefault();
            const reportingGroupId = String(new FormData(event.currentTarget).get("reportingGroupId") ?? "");
            run(async () => {
              const result = await moveFinancialAccountAction(props.node.id, reportingGroupId);
              if (result.ok) setMoveOpen(false);
              return result;
            });
          }}
        >
          <select
            name="reportingGroupId"
            defaultValue={props.node.reportingGroupId}
            className="w-full rounded-md border border-[var(--sce-color-border-standard)] px-3 py-2 text-sm"
            aria-label={t("reportingGroupLabel")}
          >
            {props.groupOptions.map((g) => (
              <option key={g.id} value={g.id}>
                {"—".repeat(g.depth)} {g.name}
              </option>
            ))}
          </select>
          <Button type="submit" size="sm" disabled={pending}>
            {t("actions.save")}
          </Button>
        </form>
      </Dialog>
    </div>
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
            <div className="flex flex-wrap gap-2">
              <Button type="button" size="sm" onClick={openCreateRootGroup}>
                {ts("createGroup")}
              </Button>
              <Button
                type="button"
                size="sm"
                variant="secondary"
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
            className="max-h-[min(32rem,70vh)] overflow-y-auto rounded-xl border border-[var(--sce-color-border-standard)] p-4"
            aria-label={ts("treeAria")}
          >
            <StructureTreeRows
              nodes={tree}
              canMutate={canMutate}
              groupOptions={groupOptions}
              mutationHandlers={mutationHandlers}
            />
          </section>
        </>
      )}

      <Dialog open={createGroupOpen} onClose={() => setCreateGroupOpen(false)} title={ts("createGroupTitle")}>
        <form
          key={`create-group-${createGroupParentPreset}`}
          className="space-y-4"
          onSubmit={(event) => {
            event.preventDefault();
            const data = new FormData(event.currentTarget);
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
          <input
            name="name"
            required
            className="w-full rounded-md border border-[var(--sce-color-border-standard)] px-3 py-2 text-sm"
            placeholder={ts("nameLabel")}
            aria-label={ts("nameLabel")}
          />
          <select
            name="parentId"
            defaultValue={createGroupParentPreset}
            className="w-full rounded-md border border-[var(--sce-color-border-standard)] px-3 py-2 text-sm"
            aria-label={ts("parentGroupLabel")}
          >
            <option value="">{ts("rootGroupOption")}</option>
            {groupOptions.map((g) => (
              <option key={g.id} value={g.id}>
                {"—".repeat(g.depth)} {g.name}
              </option>
            ))}
          </select>
          <Button type="submit" size="sm" disabled={pending}>
            {ts("actions.create")}
          </Button>
        </form>
      </Dialog>

      <Dialog open={createAccountOpen} onClose={() => setCreateAccountOpen(false)} title={ts("createAccountTitle")}>
        <form
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
          <input
            name="name"
            required
            className="w-full rounded-md border border-[var(--sce-color-border-standard)] px-3 py-2 text-sm"
            aria-label={ts("nameLabel")}
          />
          <select
            name="reportingGroupId"
            required
            defaultValue={createAccountGroupPreset || undefined}
            className="w-full rounded-md border border-[var(--sce-color-border-standard)] px-3 py-2 text-sm"
            aria-label={ts("reportingGroupLabel")}
          >
            {groupOptions.map((g) => (
              <option key={g.id} value={g.id}>
                {"—".repeat(g.depth)} {g.name}
              </option>
            ))}
          </select>
          <select
            name="canonicalSemantic"
            className="w-full rounded-md border border-[var(--sce-color-border-standard)] px-3 py-2 text-sm"
            aria-label={ts("semanticLabel")}
          >
            {FINANCE_STRUCTURE_ACCOUNT_SEMANTICS.map((semantic) => (
              <option key={semantic} value={semantic}>
                {ts(`semantics.${semantic.toLowerCase()}.label`)}
              </option>
            ))}
          </select>
          <Button type="submit" size="sm" disabled={pending}>
            {ts("actions.create")}
          </Button>
        </form>
      </Dialog>

      {defaultTemplate ? (
        <Dialog
          open={templatePreviewOpen}
          onClose={() => setTemplatePreviewOpen(false)}
          title={t(defaultTemplate.nameKey as Parameters<typeof t>[0])}
        >
          <p className="text-sm text-[var(--muted)]">
            {t(defaultTemplate.descriptionKey as Parameters<typeof t>[0])}
          </p>
          <p className="mt-2 text-sm">{t(defaultTemplate.previewSummaryKey as Parameters<typeof t>[0])}</p>
          <p className="mt-3 text-sm text-[var(--muted)]" data-testid="template-apply-customize-note">
            {ts("applyTemplateCustomizeNote")}
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
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
            <Button
              type="button"
              size="sm"
              variant="secondary"
              disabled={pending}
              onClick={() => setTemplatePreviewOpen(false)}
            >
              {ts("actions.cancel")}
            </Button>
          </div>
        </Dialog>
      ) : null}
    </div>
  );
}
