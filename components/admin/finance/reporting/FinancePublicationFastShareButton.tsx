"use client";

import { useCallback, useTransition } from "react";
import { Button } from "@/components/ui/Button";
import { ensureDefaultFinancePublicationShareAction } from "@/app/(admin)/dashboard/finance/reports/publication-share-actions";
import { useToast } from "@/hooks/use-toast";
import { copyFinancePublicationShareAbsoluteUrl } from "@/lib/finance/presentation/copy-finance-publication-share-url";
import { buildFinancePublicationShareAbsoluteUrlFromPath } from "@/lib/finance/presentation/format-finance-publication-share-url-display";
import { FinancePublicationFastShareConfirmation } from "@/components/admin/finance/reporting/FinancePublicationFastShareConfirmation";

export type FinancePublicationFastShareLabels = {
  shareAction: string;
  copyLink: string;
  openLink: string;
  linkCopiedTitle: string;
  linkCreatedTitle: string;
  linkCopiedBody: string;
  linkCopySuccess: string;
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

const SHARE_CONFIRMATION_TOAST_DURATION_MS = 12_000;

function absoluteUrlFromRelativePath(relativePath: string): string {
  const origin = typeof window !== "undefined" ? window.location.origin : "";
  return buildFinancePublicationShareAbsoluteUrlFromPath({
    origin,
    relativeSharePath: relativePath,
  });
}

export function FinancePublicationFastShareButton({
  publicationId,
  versionNumber,
  labels,
  disabled,
  onShareChanged,
  onOpenManage,
}: Props) {
  const { toast } = useToast();
  const [pending, startTransition] = useTransition();

  const showShareConfirmation = useCallback(
    (relativeSharePath: string, clipboardSucceeded: boolean) => {
      const title = clipboardSucceeded ? labels.linkCopiedTitle : labels.linkCreatedTitle;
      const absoluteUrl = absoluteUrlFromRelativePath(relativeSharePath);

      toast.success(
        <FinancePublicationFastShareConfirmation
          title={title}
          relativeSharePath={relativeSharePath}
          labels={{ openLink: labels.openLink, copyLink: labels.copyLink }}
          onOpenLink={() => {
            window.open(absoluteUrl, "_blank", "noopener,noreferrer");
          }}
          onCopyLink={() => {
            void (async () => {
              const copied = await copyFinancePublicationShareAbsoluteUrl(absoluteUrl);
              if (copied) {
                toast.success(labels.linkCopySuccess, { duration: 2500 });
              }
            })();
          }}
        />,
        { duration: SHARE_CONFIRMATION_TOAST_DURATION_MS },
      );
    },
    [
      labels.copyLink,
      labels.linkCopySuccess,
      labels.linkCopiedTitle,
      labels.linkCreatedTitle,
      labels.openLink,
      toast,
    ],
  );

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
        const absoluteUrl = absoluteUrlFromRelativePath(result.shareUrlPath);
        const copied = await copyFinancePublicationShareAbsoluteUrl(absoluteUrl);
        showShareConfirmation(result.shareUrlPath, copied);
      })();
    });
  }, [
    labels.createFailed,
    onShareChanged,
    publicationId,
    showShareConfirmation,
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
