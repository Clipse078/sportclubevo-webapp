"use client";

import { useRef, useState, useTransition, useId } from "react";
import {
  Archive,
  ArrowUp,
  FolderPlus,
  FolderTree,
  MoreHorizontal,
  Pencil,
  Plus,
  Trash2,
  Undo2,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import {
  SceConfirmDialog,
  SceOverflowMenu,
  SceOverflowMenuDivider,
  SceOverflowMenuItem,
} from "@/components/sce/actions";
import { SceFormField } from "@/components/sce/forms/SceFormField";
import type { FinanceStructureTreeNode } from "@/lib/finance/structure/build-structure-tree";
import type { FinanceStructureActionResult } from "@/app/(admin)/dashboard/finance/structure/actions";
import {
  archiveFinancialAccountAction,
  archiveReportingGroupAction,
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
import { SCE_DIALOG_ACTIONS_ROW_CLASS } from "@/lib/design-system/sce-action-dialog-micro-ux";

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

export function ReportingGroupRowActions(props: {
  node: Extract<FinanceStructureTreeNode, { type: "group" }>;
  groupOptions: GroupOption[];
  mutationHandlers: StructureMutationHandlers;
}) {
  const t = useTranslations("Finance.structure");
  const triggerRef = useRef<HTMLButtonElement>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [renameOpen, setRenameOpen] = useState(false);
  const [moveOpen, setMoveOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const renameNameId = useId();
  const moveParentId = useId();
  const isArchived = props.node.lifecycle === "ARCHIVED";

  const run = (fn: () => Promise<FinanceStructureActionResult>) => {
    runStructureMutation(startTransition, props.mutationHandlers, fn);
  };

  const closeMenu = () => setMenuOpen(false);

  return (
    <>
      <div className="shrink-0" data-sce-row-action data-testid="structure-row-actions">
        <SceOverflowMenu
          open={menuOpen}
          onOpenChange={setMenuOpen}
          anchorRef={triggerRef}
          triggerLabel={t("rowMenuTrigger")}
          menuLabel={t("rowMenuGroup")}
          triggerIcon={<MoreHorizontal className="h-4 w-4" aria-hidden="true" />}
        >
          {!isArchived ? (
            <>
              <SceOverflowMenuItem
                icon={<FolderPlus className="h-4 w-4" />}
                label={t("actions.addSubgroup")}
                onSelect={() => {
                  closeMenu();
                  props.mutationHandlers.onAddSubgroup(props.node.id);
                }}
              />
              <SceOverflowMenuItem
                icon={<Plus className="h-4 w-4" />}
                label={t("actions.addAccount")}
                onSelect={() => {
                  closeMenu();
                  props.mutationHandlers.onAddAccount(props.node.id);
                }}
              />
              <SceOverflowMenuDivider />
            </>
          ) : null}
          <SceOverflowMenuItem
            icon={<Pencil className="h-4 w-4" />}
            label={t("actions.rename")}
            onSelect={() => {
              closeMenu();
              setRenameOpen(true);
            }}
          />
          <SceOverflowMenuItem
            icon={<FolderTree className="h-4 w-4" />}
            label={t("actions.move")}
            onSelect={() => {
              closeMenu();
              setMoveOpen(true);
            }}
          />
          <SceOverflowMenuItem
            icon={<ArrowUp className="h-4 w-4" />}
            label={t("actions.moveUp")}
            onSelect={() => {
              closeMenu();
              run(async () =>
                reorderReportingGroupAction(props.node.id, Math.max(0, props.node.sortOrder - 1)),
              );
            }}
          />
          <SceOverflowMenuItem
            icon={isArchived ? <Undo2 className="h-4 w-4" /> : <Archive className="h-4 w-4" />}
            label={isArchived ? t("actions.reactivate") : t("actions.archive")}
            onSelect={() => {
              closeMenu();
              run(async () =>
                isArchived
                  ? reactivateReportingGroupAction(props.node.id)
                  : archiveReportingGroupAction(props.node.id),
              );
            }}
          />
          <SceOverflowMenuDivider />
          <SceOverflowMenuItem
            icon={<Trash2 className="h-4 w-4" />}
            label={t("actions.delete")}
            destructive
            onSelect={() => {
              closeMenu();
              setDeleteOpen(true);
            }}
          />
        </SceOverflowMenu>
      </div>

      <Dialog
        open={renameOpen}
        onClose={() => !pending && setRenameOpen(false)}
        title={t("renameGroupTitle")}
        footer={
          <div className={SCE_DIALOG_ACTIONS_ROW_CLASS}>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              disabled={pending}
              onClick={() => setRenameOpen(false)}
            >
              {t("actions.cancel")}
            </Button>
            <Button type="submit" size="sm" disabled={pending} form="rename-group-form">
              {t("actions.save")}
            </Button>
          </div>
        }
      >
        <form
          id="rename-group-form"
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
          <SceFormField label={t("nameLabel")} htmlFor={renameNameId} required density="COMPACT">
            <input
              id={renameNameId}
              name="name"
              defaultValue={props.node.name}
              className={FIELD_CONTROL_CLASS}
              required
            />
          </SceFormField>
        </form>
      </Dialog>

      <Dialog
        open={moveOpen}
        onClose={() => !pending && setMoveOpen(false)}
        title={t("moveGroupTitle")}
        footer={
          <div className={SCE_DIALOG_ACTIONS_ROW_CLASS}>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              disabled={pending}
              onClick={() => setMoveOpen(false)}
            >
              {t("actions.cancel")}
            </Button>
            <Button type="submit" size="sm" disabled={pending} form="move-group-form">
              {t("actions.save")}
            </Button>
          </div>
        }
      >
        <form
          id="move-group-form"
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
          <SceFormField label={t("parentGroupLabel")} htmlFor={moveParentId} density="COMPACT">
            <select
              id={moveParentId}
              name="parentId"
              defaultValue={props.node.parentId ?? ""}
              className={FIELD_CONTROL_CLASS}
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
          </SceFormField>
        </form>
      </Dialog>

      <SceConfirmDialog
        open={deleteOpen}
        onClose={() => !pending && setDeleteOpen(false)}
        title={t("deleteGroupTitle")}
        description={t("confirmDeleteGroup")}
        dialogType="DESTRUCTIVE_CONFIRMATION"
        confirmLabel={t("actions.delete")}
        cancelLabel={t("actions.cancel")}
        confirmLoading={pending}
        onConfirm={() => {
          run(async () => {
            const result = await deleteReportingGroupAction(props.node.id);
            if (result.ok) setDeleteOpen(false);
            return result;
          });
        }}
      />
    </>
  );
}

export function AccountRowActions(props: {
  node: Extract<FinanceStructureTreeNode, { type: "account" }>;
  groupOptions: GroupOption[];
  mutationHandlers: StructureMutationHandlers;
}) {
  const t = useTranslations("Finance.structure");
  const triggerRef = useRef<HTMLButtonElement>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [renameOpen, setRenameOpen] = useState(false);
  const [moveOpen, setMoveOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const renameNameId = useId();
  const moveGroupId = useId();
  const isArchived = props.node.lifecycle === "ARCHIVED";

  const run = (fn: () => Promise<FinanceStructureActionResult>) => {
    runStructureMutation(startTransition, props.mutationHandlers, fn);
  };

  const closeMenu = () => setMenuOpen(false);

  return (
    <>
      <div className="shrink-0" data-sce-row-action data-testid="structure-row-actions">
        <SceOverflowMenu
          open={menuOpen}
          onOpenChange={setMenuOpen}
          anchorRef={triggerRef}
          triggerLabel={t("rowMenuTrigger")}
          menuLabel={t("rowMenuAccount")}
          triggerIcon={<MoreHorizontal className="h-4 w-4" aria-hidden="true" />}
        >
          <SceOverflowMenuItem
            icon={<Pencil className="h-4 w-4" />}
            label={t("actions.rename")}
            onSelect={() => {
              closeMenu();
              setRenameOpen(true);
            }}
          />
          <SceOverflowMenuItem
            icon={<FolderTree className="h-4 w-4" />}
            label={t("actions.move")}
            onSelect={() => {
              closeMenu();
              setMoveOpen(true);
            }}
          />
          <SceOverflowMenuItem
            icon={<ArrowUp className="h-4 w-4" />}
            label={t("actions.moveUp")}
            onSelect={() => {
              closeMenu();
              run(async () =>
                reorderFinancialAccountAction(props.node.id, Math.max(0, props.node.sortOrder - 1)),
              );
            }}
          />
          <SceOverflowMenuItem
            icon={isArchived ? <Undo2 className="h-4 w-4" /> : <Archive className="h-4 w-4" />}
            label={isArchived ? t("actions.reactivate") : t("actions.archive")}
            onSelect={() => {
              closeMenu();
              run(async () =>
                isArchived
                  ? reactivateFinancialAccountAction(props.node.id)
                  : archiveFinancialAccountAction(props.node.id),
              );
            }}
          />
          <SceOverflowMenuDivider />
          <SceOverflowMenuItem
            icon={<Trash2 className="h-4 w-4" />}
            label={t("actions.delete")}
            destructive
            onSelect={() => {
              closeMenu();
              setDeleteOpen(true);
            }}
          />
        </SceOverflowMenu>
      </div>

      <Dialog
        open={renameOpen}
        onClose={() => !pending && setRenameOpen(false)}
        title={t("renameAccountTitle")}
        footer={
          <div className={SCE_DIALOG_ACTIONS_ROW_CLASS}>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              disabled={pending}
              onClick={() => setRenameOpen(false)}
            >
              {t("actions.cancel")}
            </Button>
            <Button type="submit" size="sm" disabled={pending} form="rename-account-form">
              {t("actions.save")}
            </Button>
          </div>
        }
      >
        <form
          id="rename-account-form"
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
          <SceFormField label={t("nameLabel")} htmlFor={renameNameId} required density="COMPACT">
            <input
              id={renameNameId}
              name="name"
              defaultValue={props.node.name}
              className={FIELD_CONTROL_CLASS}
              required
            />
          </SceFormField>
        </form>
      </Dialog>

      <Dialog
        open={moveOpen}
        onClose={() => !pending && setMoveOpen(false)}
        title={t("moveAccountTitle")}
        footer={
          <div className={SCE_DIALOG_ACTIONS_ROW_CLASS}>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              disabled={pending}
              onClick={() => setMoveOpen(false)}
            >
              {t("actions.cancel")}
            </Button>
            <Button type="submit" size="sm" disabled={pending} form="move-account-form">
              {t("actions.save")}
            </Button>
          </div>
        }
      >
        <form
          id="move-account-form"
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
          <SceFormField label={t("reportingGroupLabel")} htmlFor={moveGroupId} required density="COMPACT">
            <select
              id={moveGroupId}
              name="reportingGroupId"
              defaultValue={props.node.reportingGroupId}
              className={FIELD_CONTROL_CLASS}
              required
            >
              {props.groupOptions.map((g) => (
                <option key={g.id} value={g.id}>
                  {"—".repeat(g.depth)} {g.name}
                </option>
              ))}
            </select>
          </SceFormField>
        </form>
      </Dialog>

      <SceConfirmDialog
        open={deleteOpen}
        onClose={() => !pending && setDeleteOpen(false)}
        title={t("deleteAccountTitle")}
        description={t("confirmDeleteAccount")}
        dialogType="DESTRUCTIVE_CONFIRMATION"
        confirmLabel={t("actions.delete")}
        cancelLabel={t("actions.cancel")}
        confirmLoading={pending}
        onConfirm={() => {
          run(async () => {
            const result = await deleteFinancialAccountAction(props.node.id);
            if (result.ok) setDeleteOpen(false);
            return result;
          });
        }}
      />
    </>
  );
}
