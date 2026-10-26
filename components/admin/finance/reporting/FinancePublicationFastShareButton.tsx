"use client";

import { useCallback, useEffect, useState, useTransition } from "react";
import { Button } from "@/components/ui/Button";
import {
  ensureDefaultFinancePublicationShareAction,
  getDefaultFinancePublicationShareStatusAction,
} from "@/app/(admin)/dashboard/finance/reports/publication-share-actions";
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
  reloadKey = 0,
}: Props) {
  const { toast } = useToast();
  const [pending, startTransition] = useTransition();
  const [hasActiveDefault, setHasActiveDefault] = useState(false);
  const [cachedSharePath, setCachedSharePath] = useState<string | null>(null);
  const [statusLoaded, setStatusLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    startTransition(() => {
      void (async () => {
        const result = await getDefaultFinancePublicationShareStatusAction({
          publicationId,
          versionNumber,
        });
        if (cancelled) return;
        setStatusLoaded(true);
        if (result.ok) {
          setHasActiveDefault(result.hasActiveDefault);
          setCachedSharePath(result.shareUrlPath);
        }
      })();
    });
    return () => {
      cancelled = true;
    };
  }, [publicationId, versionNumber, reloadKey]);

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
        if (hasActiveDefault && cachedSharePath) {
          const copied = await copyShareUrl(cachedSharePath);
          if (copied) {
            showSuccessToast();
          }
          return;
        }

        const result = await ensureDefaultFinancePublicationShareAction({
          publicationId,
          versionNumber,
        });
        if (!result.ok) {
          toast.danger(labels.createFailed);
          return;
        }
        setHasActiveDefault(true);
        setCachedSharePath(result.shareUrlPath);
        onShareChanged?.();
        const copied = await copyShareUrl(result.shareUrlPath);
        if (copied) {
          showSuccessToast();
        }
      })();
    });
  }, [
    cachedSharePath,
    financeYearName,
    hasActiveDefault,
    labels.createFailed,
    onShareChanged,
    publicationId,
    showSuccessToast,
    toast,
    versionNumber,
  ]);

  const primaryLabel =
    hasActiveDefault && statusLoaded ? labels.copyLink : labels.shareAction;

  return (
    <div className="flex flex-wrap items-center gap-2" data-finance-publication-fast-share>
      <Button
        type="button"
        variant="secondary"
        size="sm"
        disabled={disabled || pending}
        onClick={onPrimaryShare}
        data-finance-publication-share-trigger
        data-finance-publication-share-mode={hasActiveDefault ? "copy" : "share"}
      >
        {primaryLabel}
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
