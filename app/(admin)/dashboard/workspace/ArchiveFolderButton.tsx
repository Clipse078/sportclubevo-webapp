"use client";

import { ArchiveSceIcon } from "@/components/icons/domain-sce-icon-components";
import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";

import { archiveWorkspaceFolderAction } from "@/app/(admin)/dashboard/workspace/actions";

type ArchiveFolderButtonProps = {
  folderId: string;
  folderName: string;
  variant?: "prominent" | "subtle";
};

export function ArchiveFolderButton({
  folderId,
  folderName,
  variant = "prominent",
}: ArchiveFolderButtonProps) {
  const t = useTranslations("Workspace.archiveFolder");
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const confirmed = window.confirm(
      t("confirmMessage", { name: folderName }),
    );

    if (!confirmed) return;

    setError(null);

    const formData = new FormData();
    formData.set("folderId", folderId);

    startTransition(async () => {
      const result = await archiveWorkspaceFolderAction(formData);

      if (!result.ok) {
        setError(result.message ?? t("errorGeneric"));
      }
    });
  }

  return (
    <div>
      <form onSubmit={handleSubmit}>
        <button
          type="submit"
          disabled={isPending}
          className={
            variant === "subtle"
              ? "inline-flex w-full items-center justify-start gap-2 rounded-md px-1 py-1.5 text-xs font-medium text-[var(--text-2)] transition hover:bg-[var(--surface-2)] disabled:cursor-not-allowed disabled:opacity-50"
              : "inline-flex w-full items-center justify-center gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm font-semibold text-red-700 transition hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-50"
          }
        >
          <ArchiveSceIcon className="h-4 w-4" aria-hidden="true" />
          {isPending ? t("archivingLabel") : t("buttonLabel")}
        </button>
      </form>

      {error ? (
        <p
          role="alert"
          className="mt-2 text-xs leading-5 text-[var(--sce-danger)]"
        >
          {error}
        </p>
      ) : null}
    </div>
  );
}
