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

type GroupOption = { id: string; name: string; depth: number };

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
  onMutated: () => void;
}) {
  const t = useTranslations("Finance.structure");
  const [pending, startTransition] = useTransition();
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
                  <span className="text-xs text-[var(--muted)]">{t("archivedBadge")}</span>
                ) : null}
                {props.canMutate ? (
                  <GroupActions
                    node={node}
                    groupOptions={props.groupOptions}
                    pending={pending}
                    onMutated={props.onMutated}
                    startTransition={startTransition}
                  />
                ) : null}
              </div>
              {node.children.length > 0 ? (
                <StructureTreeRows
                  nodes={node.children}
                  depth={depth + 1}
                  canMutate={props.canMutate}
                  groupOptions={props.groupOptions}
                  onMutated={props.onMutated}
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
                <span className="text-xs text-[var(--muted)]">{t("archivedBadge")}</span>
              ) : null}
              {props.canMutate ? (
                <AccountActions
                  node={node}
                  groupOptions={props.groupOptions}
                  pending={pending}
                  onMutated={props.onMutated}
                  startTransition={startTransition}
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
  pending: boolean;
  onMutated: () => void;
  startTransition: (fn: () => void) => void;
}) {
  const t = useTranslations("Finance.structure");
  const [renameOpen, setRenameOpen] = useState(false);
  const [moveOpen, setMoveOpen] = useState(false);

  const run = (fn: () => Promise<{ ok: boolean }>) => {
    props.startTransition(async () => {
      await fn();
      props.onMutated();
    });
  };

  return (
    <div className="ms-auto flex flex-wrap gap-1">
      <Button type="button" size="sm" variant="ghost" disabled={props.pending} onClick={() => setRenameOpen(true)}>
        {t("actions.rename")}
      </Button>
      <Button type="button" size="sm" variant="ghost" disabled={props.pending} onClick={() => setMoveOpen(true)}>
        {t("actions.move")}
      </Button>
      <Button
        type="button"
        size="sm"
        variant="ghost"
        disabled={props.pending}
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
        disabled={props.pending}
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
        disabled={props.pending}
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
          <Button type="submit" size="sm" disabled={props.pending}>
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
          <Button type="submit" size="sm" disabled={props.pending}>
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
  pending: boolean;
  onMutated: () => void;
  startTransition: (fn: () => void) => void;
}) {
  const t = useTranslations("Finance.structure");
  const [renameOpen, setRenameOpen] = useState(false);
  const [moveOpen, setMoveOpen] = useState(false);

  const run = (fn: () => Promise<{ ok: boolean }>) => {
    props.startTransition(async () => {
      await fn();
      props.onMutated();
    });
  };

  return (
    <div className="ms-auto flex flex-wrap gap-1">
      <Button type="button" size="sm" variant="ghost" disabled={props.pending} onClick={() => setRenameOpen(true)}>
        {t("actions.rename")}
      </Button>
      <Button type="button" size="sm" variant="ghost" disabled={props.pending} onClick={() => setMoveOpen(true)}>
        {t("actions.move")}
      </Button>
      <Button
        type="button"
        size="sm"
        variant="ghost"
        disabled={props.pending}
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
        disabled={props.pending}
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
        disabled={props.pending}
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
          <Button type="submit" size="sm" disabled={props.pending}>
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
          <Button type="submit" size="sm" disabled={props.pending}>
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

  const groupOptions = useMemo(
    () => (initialGroupOptions.length > 0 ? initialGroupOptions : flattenGroupOptions(tree)),
    [initialGroupOptions, tree],
  );

  const defaultTemplate = FINANCE_STRUCTURE_TEMPLATE_REGISTRY[0];

  const onMutated = () => {
    router.refresh();
  };

  return (
    <div className="space-y-6" data-finance-structure-panel>
      {isEmpty ? (
        <section className="rounded-xl border border-[var(--sce-color-border-standard)] p-5">
          <h2 className="text-sm font-semibold">{ts("emptyTitle")}</h2>
          <p className="mt-1 text-sm text-[var(--muted)]">{ts("emptyBody")}</p>
          {canMutate && !appliedTemplateKey ? (
            <div className="mt-4 flex flex-wrap gap-2">
              <Button type="button" size="sm" variant="secondary" onClick={() => setTemplatePreviewOpen(true)}>
                {ts("previewTemplate")}
              </Button>
              <Button type="button" size="sm" onClick={() => setCreateGroupOpen(true)}>
                {ts("createRootGroup")}
              </Button>
            </div>
          ) : null}
        </section>
      ) : (
        <>
          {canMutate ? (
            <div className="flex flex-wrap gap-2">
              <Button type="button" size="sm" onClick={() => setCreateGroupOpen(true)}>
                {ts("createGroup")}
              </Button>
              <Button
                type="button"
                size="sm"
                variant="secondary"
                disabled={groupOptions.length === 0}
                onClick={() => setCreateAccountOpen(true)}
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
              onMutated={onMutated}
            />
          </section>
        </>
      )}

      <Dialog open={createGroupOpen} onClose={() => setCreateGroupOpen(false)} title={ts("createGroupTitle")}>
        <form
          className="space-y-4"
          onSubmit={(event) => {
            event.preventDefault();
            const data = new FormData(event.currentTarget);
            const name = String(data.get("name") ?? "").trim();
            const parentId = String(data.get("parentId") ?? "");
            startTransition(async () => {
              const result = await createReportingGroupAction({
                name,
                parentId: parentId === "" ? null : parentId,
              });
              if (result.ok) {
                setCreateGroupOpen(false);
                onMutated();
              }
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
          className="space-y-4"
          onSubmit={(event) => {
            event.preventDefault();
            const data = new FormData(event.currentTarget);
            startTransition(async () => {
              const result = await createFinancialAccountAction({
                name: String(data.get("name") ?? "").trim(),
                reportingGroupId: String(data.get("reportingGroupId") ?? ""),
                canonicalSemantic: String(data.get("canonicalSemantic") ?? "EXPENSE") as CanonicalAccountSemantic,
              });
              if (result.ok) {
                setCreateAccountOpen(false);
                onMutated();
              }
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
          <div className="mt-4 flex gap-2">
            <Button
              type="button"
              size="sm"
              disabled={pending}
              onClick={() => {
                startTransition(async () => {
                  const result = await applyStructureTemplateAction(defaultTemplate.key);
                  if (result.ok) {
                    setTemplatePreviewOpen(false);
                    onMutated();
                  }
                });
              }}
            >
              {ts("applyTemplate")}
            </Button>
          </div>
        </Dialog>
      ) : null}
    </div>
  );
}
