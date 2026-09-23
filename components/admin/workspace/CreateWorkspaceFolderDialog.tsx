"use client";

import { FolderPlus } from "lucide-react";
import {
  useEffect,
  useRef,
  useState,
  useTransition,
  type ReactNode,
} from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";

import {
  createChildWorkspaceFolderAction,
  createRootWorkspaceFolderAction,
} from "@/app/(admin)/dashboard/workspace/actions";
import { Dialog } from "@/components/ui/Dialog";

export type CreateWorkspaceFolderMode = "root" | "child";

type CreateWorkspaceFolderDialogProps = {
  mode: CreateWorkspaceFolderMode;
  parentId?: string;
  destinationLabel?: string;
  trigger?: ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
};

export function CreateWorkspaceFolderDialog({
  mode,
  parentId,
  destinationLabel,
  trigger,
  open: controlledOpen,
  onOpenChange,
}: CreateWorkspaceFolderDialogProps) {
  const t = useTranslations("Workspace.createFolder");
  const router = useRouter();
  const [internalOpen, setInternalOpen] = useState(false);
  const isControlled = controlledOpen !== undefined;
  const isOpen = isControlled ? controlledOpen : internalOpen;
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const inputRef = useRef<HTMLInputElement>(null);

  function setOpen(next: boolean) {
    if (!isControlled) setInternalOpen(next);
    onOpenChange?.(next);
  }

  useEffect(() => {
    if (!isOpen) return;
    const timer = setTimeout(() => inputRef.current?.focus(), 50);
    return () => clearTimeout(timer);
  }, [isOpen]);

  function openDialog() {
    setName("");
    setError(null);
    setOpen(true);
  }

  function closeDialog() {
    if (isPending) return;
    setOpen(false);
    setName("");
    setError(null);
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const trimmedName = name.trim();
    if (!trimmedName || isPending) return;

    setError(null);
    const formData = new FormData();
    formData.set("name", trimmedName);
    if (mode === "child" && parentId) {
      formData.set("parentId", parentId);
    }

    startTransition(async () => {
      const result =
        mode === "root"
          ? await createRootWorkspaceFolderAction(formData)
          : await createChildWorkspaceFolderAction(formData);

      if (!result.ok) {
        const message =
          result.code === "WORKSPACE_FOLDER_NAME_CONFLICT"
            ? t("errorConflict")
            : result.message ?? t("errorGeneric");
        setError(message);
        setTimeout(() => {
          inputRef.current?.focus();
          inputRef.current?.select();
        }, 0);
        return;
      }

      setOpen(false);
      setName("");
      if (mode === "root" && result.data && "id" in result.data) {
        router.push(
          `/dashboard/workspace?folder=${encodeURIComponent(result.data.id)}`,
        );
      } else {
        router.refresh();
      }
    });
  }

  const canSubmit = name.trim().length > 0 && !isPending;
  const inputId = `create-folder-name-${mode}-${parentId ?? "root"}`;
  const errorId = `${inputId}-error`;

  const dialogTitle =
    mode === "root" ? t("dialogTitle") : t("dialogTitleSubfolder");

  return (
    <>
      {trigger ? (
        <span
          role="presentation"
          onClick={openDialog}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              openDialog();
            }
          }}
        >
          {trigger}
        </span>
      ) : mode === "root" ? (
        <button
          type="button"
          onClick={openDialog}
          title={t("buttonLabel")}
          aria-label={t("buttonLabel")}
          className="flex h-7 w-7 items-center justify-center rounded-md text-[var(--muted)] transition-colors hover:bg-[var(--surface-2)] hover:text-[var(--text)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--sce-primary)]"
        >
          <FolderPlus className="h-3.5 w-3.5" aria-hidden="true" />
        </button>
      ) : null}

      <Dialog
        open={isOpen}
        onClose={closeDialog}
        title={dialogTitle}
        size="sm"
        footer={
          <>
            <button
              type="button"
              onClick={closeDialog}
              disabled={isPending}
              className="fca-button-secondary"
            >
              {t("cancelButton")}
            </button>
            <button
              type="submit"
              form={`create-folder-form-${inputId}`}
              disabled={!canSubmit}
              className="fca-button-primary"
            >
              {isPending ? t("submittingLabel") : t("submitButton")}
            </button>
          </>
        }
      >
        <form
          id={`create-folder-form-${inputId}`}
          onSubmit={handleSubmit}
          noValidate
        >
          {destinationLabel ? (
            <p className="mb-3 text-xs text-[var(--text-2)]">
              {t("destinationContext", { destination: destinationLabel })}
            </p>
          ) : null}

          <label htmlFor={inputId} className="block">
            <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">
              {t("fieldLabel")}
            </span>
            <input
              id={inputId}
              ref={inputRef}
              type="text"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                if (error) setError(null);
              }}
              maxLength={120}
              autoComplete="off"
              disabled={isPending}
              placeholder={t("fieldPlaceholder")}
              aria-invalid={error ? "true" : undefined}
              aria-describedby={error ? errorId : undefined}
              className={`w-full rounded-lg border px-3 py-2 text-sm text-[var(--text)] outline-none transition placeholder:text-[var(--muted)] disabled:cursor-not-allowed disabled:opacity-60 ${
                error
                  ? "border-[var(--sce-danger)] focus:border-[var(--sce-danger)]"
                  : "border-[var(--border)] focus:border-[var(--blue)]"
              }`}
            />
          </label>

          {error ? (
            <p
              id={errorId}
              role="alert"
              aria-live="polite"
              className="mt-2 text-xs leading-5 text-[var(--sce-danger)]"
            >
              {error}
            </p>
          ) : null}
        </form>
      </Dialog>
    </>
  );
}

/** Menu item trigger for command bar create menu. */
export function CreateFolderMenuItem({
  onSelect,
}: {
  onSelect: () => void;
}) {
  const t = useTranslations("Workspace.createFolder");
  return (
    <button
      type="button"
      role="menuitem"
      className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-[var(--text-2)] hover:bg-[var(--surface-2)] hover:text-[var(--text)]"
      onClick={onSelect}
    >
      <FolderPlus className="h-4 w-4 shrink-0" aria-hidden="true" />
      {t("menuItemLabel")}
    </button>
  );
}
