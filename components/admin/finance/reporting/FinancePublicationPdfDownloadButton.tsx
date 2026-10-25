"use client";

import { Button } from "@/components/ui/Button";
import { financePublicationPdfDownloadPath } from "@/lib/finance/presentation/finance-publication-pdf-download-path";

type Props = {
  publicationId: string;
  versionNumber: number;
  label: string;
  variant?: "primary" | "secondary" | "ghost";
  size?: "sm" | "default";
  className?: string;
};

export function FinancePublicationPdfDownloadButton({
  publicationId,
  versionNumber,
  label,
  variant = "secondary",
  size = "sm",
  className,
}: Props) {
  const href = financePublicationPdfDownloadPath({ publicationId, versionNumber });

  return (
    <Button
      type="button"
      variant={variant}
      size={size}
      className={className}
      data-finance-publication-pdf-download={versionNumber}
      onClick={() => {
        window.location.assign(href);
      }}
    >
      {label}
    </Button>
  );
}
