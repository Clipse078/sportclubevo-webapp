"use client";

import { useCallback, useTransition } from "react";
import { Button } from "@/components/ui/Button";
import { ensureDefaultFinancePublicationShareAction } from "@/app/(admin)/dashboard/finance/reports/publication-share-actions";
import { useToast } from "@/hooks/use-toast";

export type FinancePublicationFastShareLabels = {
  shareAction: string;
  copyLink: string;
  linkCopiedTitle: string;
  linkCopiedBody: string;
  createFailed: string;
  manageAction: string;
};

type Props = {
  publicationId: string;
  versionNumber: number;
  financeYearName: string;
  labels: FinancePublicationFastShareLabels;
  disabled?: boolean;
  onShareChanged?: () => void;
  onOpenManage?: () => void;
  /** Reserved for share-management refresh; fast path does not preload share status. */
  reloadKey?: number;
};

async function copyShareUrl(relativePath: string): Promise<boolean> {
  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const url = `${origin}${relativePath}`;
  try {
    await navigator.clipboard.writeText(url);
    return true;
  } catch {
    return false;
  }
}

export function FinancePublicationFastShareButton({
  publicationId,
  versionNumber,
  financeYearName,
  labels,
  disabled,
  onShareChanged,
  onOpenManage,
}: Props) {
  const { toast } = useToast();
  const [pending, startTransition] = useTransition();

  const showSuccessToast = useCallback(() => {
    toast.success(
      `${labels.linkCopiedTitle} — ${labels.linkCopiedBody
        .replace("{year}", financeYearName)
        .replace("{version}", String(versionNumber))}`,
    );
  }, [financeYearName, labels.linkCopiedBody, labels.linkCopiedTitle, toast, versionNumber]);

  const onPrimaryShare = useCallback(() => {
    startTransition(() => {
      void (async () => {
        const result = await ensureDefaultFinancePublicationShareAction({
          publicationId,
          versionNumber,
        });
        if (!result.ok) {
          toast.danger(labels.createFailed);
          return;
        }
        onShareChanged?.();
        const copied = await copyShareUrl(result.shareUrlPath);
        if (copied) {
          showSuccessToast();
        }
      })();
    });
  }, [
    labels.createFailed,
    onShareChanged,
    publicationId,
    showSuccessToast,
    toast,
    versionNumber,
  ]);

  return (
    <div className="flex flex-wrap items-center gap-2" data-finance-publication-fast-share>
      <Button
        type="button"
        variant="secondary"
        size="sm"
        disabled={disabled || pending}
        onClick={onPrimaryShare}
        data-finance-publication-share-trigger
        data-finance-publication-share-mode="share"
      >
        {labels.shareAction}
      </Button>
      {onOpenManage ? (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          disabled={disabled}
          onClick={onOpenManage}
          data-finance-publication-share-manage-trigger
        >
          {labels.manageAction}
        </Button>
      ) : null}
    </div>
  );
}
