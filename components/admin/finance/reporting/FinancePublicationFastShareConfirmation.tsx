"use client";

import { cn } from "@/lib/cn";
import {
  buildFinancePublicationShareAbsoluteUrlFromPath,
  formatCompactFinancePublicationShareUrlLabel,
} from "@/lib/finance/presentation/format-finance-publication-share-url-display";

export type FinancePublicationFastShareConfirmationLabels = {
  openLink: string;
  copyLink: string;
};

type Props = {
  title: string;
  relativeSharePath: string;
  labels: FinancePublicationFastShareConfirmationLabels;
  onCopyLink: () => void;
  onOpenLink: () => void;
};

export function FinancePublicationFastShareConfirmation({
  title,
  relativeSharePath,
  labels,
  onCopyLink,
  onOpenLink,
}: Props) {
  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const absoluteUrl = buildFinancePublicationShareAbsoluteUrlFromPath({
    origin,
    relativeSharePath,
  });
  const compactLabel = formatCompactFinancePublicationShareUrlLabel({
    origin,
    relativeSharePath,
  });

  return (
    <div
      className="flex w-full min-w-0 flex-col gap-2"
      data-finance-publication-fast-share-confirmation
    >
      <p className="text-sm font-semibold leading-snug">{title}</p>
      <p
        className="break-all font-mono text-xs leading-snug opacity-90"
        title={absoluteUrl}
        data-finance-publication-fast-share-url-display
        data-testid="finance-publication-fast-share-url-display"
      >
        {compactLabel}
      </p>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          className={cn(
            "rounded-md border border-current/25 px-2.5 py-1 text-xs font-medium",
            "hover:bg-black/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-current",
          )}
          onClick={onOpenLink}
          data-finance-publication-fast-share-open
        >
          {labels.openLink}
        </button>
        <button
          type="button"
          className={cn(
            "rounded-md border border-current/25 px-2.5 py-1 text-xs font-medium",
            "hover:bg-black/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-current",
          )}
          onClick={onCopyLink}
          data-finance-publication-fast-share-copy
        >
          {labels.copyLink}
        </button>
      </div>
    </div>
  );
}
