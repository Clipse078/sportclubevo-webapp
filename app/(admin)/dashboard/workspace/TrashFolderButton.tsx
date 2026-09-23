"use client";

import { Trash2 } from "lucide-react";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";

import { trashWorkspaceFolderAction } from "@/app/(admin)/dashboard/workspace/actions";

type TrashFolderButtonProps = {
  folderId: string;
  folderName: string;
};

export function TrashFolderButton({ folderId, folderName }: TrashFolderButtonProps) {
  const t = useTranslations("Workspace.trashFolder");
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [asyncMessage, setAsyncMessage] = useState<string | null>(null);

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const confirmed = window.confirm(t("confirmMessage", { name: folderName }));
    if (!confirmed) return;

    setError(null);
    setAsyncMessage(null);

    const formData = new FormData();
    formData.set("folderId", folderId);

    startTransition(async () => {
      const result = await trashWorkspaceFolderAction(formData);
      if (!result.ok) {
        setError(result.message ?? t("errorGeneric"));
        return;
      }
      if (result.data.mode === "ASYNC") {
        setAsyncMessage(t("asyncMessage"));
      } else {
        router.refresh();
      }
    });
  }

  return (
    <div>
      <form onSubmit={handleSubmit}>
        <button
          type="submit"
          disabled={isPending}
          className="inline-flex w-full items-center justify-start gap-2 rounded-md px-1 py-1.5 text-xs font-medium text-[var(--text-2)] transition hover:bg-[var(--surface-2)] disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Trash2 className="h-4 w-4" aria-hidden="true" />
          {isPending ? t("pendingLabel") : t("buttonLabel")}
        </button>
      </form>
      {asyncMessage ? (
        <p className="mt-1 text-xs text-[var(--text-2)]" role="status">
          {asyncMessage}
        </p>
      ) : null}
      {error ? (
        <p role="alert" className="mt-2 text-xs text-[var(--sce-danger)]">
          {error}
        </p>
      ) : null}
    </div>
  );
}
