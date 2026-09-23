"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";

import { Dialog } from "@/components/ui/Dialog";
import { Button } from "@/components/ui/Button";

type WorkspaceDocumentRenameDialogProps = {
  open: boolean;
  onClose: () => void;
  documentId: string;
  currentName: string;
};

export function WorkspaceDocumentRenameDialog({
  open,
  onClose,
  documentId,
  currentName,
}: WorkspaceDocumentRenameDialogProps) {
  const t = useTranslations("Workspace.renameDocument");
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [name, setName] = useState(currentName);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setName(currentName);
      setError(null);
      requestAnimationFrame(() => {
        inputRef.current?.focus();
        inputRef.current?.select();
      });
    }
  }, [open, currentName]);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setPending(true);
    setError(null);

    try {
      const response = await fetch(
        `/api/workspace/documents/${encodeURIComponent(documentId)}/rename`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name }),
        },
      );
      const data = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(data?.error ?? t("errorGeneric"));
      }
      onClose();
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : t("errorGeneric"));
    } finally {
      setPending(false);
    }
  }

  return (
    <Dialog
      open={open}
      onClose={() => !pending && onClose()}
      title={t("title")}
      description={t("description")}
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={pending}>
            {t("cancel")}
          </Button>
          <Button
            variant="primary"
            loading={pending}
            disabled={!name.trim()}
            onClick={() => void handleSubmit({ preventDefault: () => {} } as React.FormEvent)}
          >
            {t("submit")}
          </Button>
        </>
      }
    >
      <form onSubmit={(e) => void handleSubmit(e)} className="space-y-3">
        <label className="block text-sm font-medium text-[var(--text)]" htmlFor="doc-rename-input">
          {t("fieldLabel")}
        </label>
        <input
          id="doc-rename-input"
          ref={inputRef}
          type="text"
          value={name}
          disabled={pending}
          onChange={(e) => setName(e.target.value)}
          className="w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--text)] outline-none focus:border-[var(--blue)] disabled:opacity-60"
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? "doc-rename-error" : undefined}
        />
        {error ? (
          <p id="doc-rename-error" role="alert" className="text-sm text-[var(--sce-danger)]">
            {error}
          </p>
        ) : null}
      </form>
    </Dialog>
  );
}
