"use client";

import { useCallback, useState } from "react";
import { Dialog } from "@/components/ui/Dialog";
import { Button } from "@/components/ui/Button";
import { SceSegmentedControl } from "@/components/admin/shared/SceSegmentedControl";
import { createFinancePublicationShareAction } from "@/app/(admin)/dashboard/finance/reports/publication-share-actions";

export type FinancePublicationShareDialogLabels = {
  shareAction: string;
  dialogTitle: string;
  contextLine: string;
  expirySection: string;
  expiryNone: string;
  expiryDate: string;
  expiryDateLabel: string;
  createShare: string;
  cancel: string;
  creating: string;
  linkTitle: string;
  linkExplanation: string;
  copyLink: string;
  copied: string;
  createFailed: string;
  shareableHint: string;
};

type Props = {
  publicationId: string;
  versionNumber: number;
  financeYearName: string;
  publishedAtLabel: string;
  publishedAtFormatted: string;
  labels: FinancePublicationShareDialogLabels;
  disabled?: boolean;
  onShareCreated?: () => void;
};

type ExpiryMode = "NONE" | "DATE";

export function FinancePublicationShareDialog({
  publicationId,
  versionNumber,
  financeYearName,
  publishedAtLabel,
  publishedAtFormatted,
  labels,
  disabled,
  onShareCreated,
}: Props) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expiryMode, setExpiryMode] = useState<ExpiryMode>("NONE");
  const [expiresAtDate, setExpiresAtDate] = useState("");
  const [createdLink, setCreatedLink] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const reset = useCallback(() => {
    setError(null);
    setBusy(false);
    setExpiryMode("NONE");
    setExpiresAtDate("");
    setCreatedLink(null);
    setCopied(false);
  }, []);

  const close = useCallback(() => {
    setOpen(false);
    reset();
  }, [reset]);

  const onCreate = useCallback(async () => {
    setBusy(true);
    setError(null);
    setCopied(false);
    try {
      const expiresAtIso =
        expiryMode === "DATE" && expiresAtDate
          ? new Date(`${expiresAtDate}T23:59:59`).toISOString()
          : null;
      const result = await createFinancePublicationShareAction({
        publicationId,
        versionNumber,
        expiryMode,
        expiresAtIso,
      });
      if (!result.ok) {
        setError(result.error || labels.createFailed);
        return;
      }
      const origin = typeof window !== "undefined" ? window.location.origin : "";
      setCreatedLink(`${origin}${result.shareUrlPath}`);
      onShareCreated?.();
    } catch {
      setError(labels.createFailed);
    } finally {
      setBusy(false);
    }
  }, [expiryMode, expiresAtDate, labels.createFailed, onShareCreated, publicationId, versionNumber]);

  const onCopy = useCallback(async () => {
    if (!createdLink) return;
    try {
      await navigator.clipboard.writeText(createdLink);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  }, [createdLink]);

  const contextLine = labels.contextLine
    .replace("{year}", financeYearName)
    .replace("{version}", String(versionNumber))
    .replace("{publishedAt}", publishedAtFormatted);

  return (
    <>
      <Button
        type="button"
        variant="secondary"
        size="sm"
        disabled={disabled}
        onClick={() => {
          reset();
          setOpen(true);
        }}
        data-finance-publication-share-trigger
      >
        {labels.shareAction}
      </Button>
      <Dialog
        open={open}
        onClose={close}
        title={labels.dialogTitle}
        description={contextLine}
        footer={
          createdLink ? (
            <Button type="button" onClick={close}>
              {labels.cancel}
            </Button>
          ) : (
            <>
              <Button type="button" variant="secondary" onClick={close} disabled={busy}>
                {labels.cancel}
              </Button>
              <Button type="button" onClick={() => void onCreate()} disabled={busy}>
                {busy ? labels.creating : labels.createShare}
              </Button>
            </>
          )
        }
      >
        <div className="flex flex-col gap-5" data-finance-publication-share-dialog>
          {!createdLink ? (
            <>
              <p className="text-sm text-[var(--muted)]">{labels.shareableHint}</p>
              <div className="space-y-2">
                <p className="text-sm font-medium text-[var(--foreground)]">{labels.expirySection}</p>
                <SceSegmentedControl<ExpiryMode>
                  value={expiryMode}
                  onChange={setExpiryMode}
                  options={[
                    { value: "NONE", label: labels.expiryNone },
                    { value: "DATE", label: labels.expiryDate },
                  ]}
                  aria-label={labels.expirySection}
                />
                {expiryMode === "DATE" ? (
                  <label className="block text-sm">
                    <span className="mb-1 block text-[var(--muted)]">{labels.expiryDateLabel}</span>
                    <input
                      type="date"
                      className="w-full rounded-md border border-[var(--sce-surface-border-subtle)] bg-[var(--background)] px-3 py-2 text-sm"
                      value={expiresAtDate}
                      onChange={(e) => setExpiresAtDate(e.target.value)}
                      data-finance-publication-share-expiry-date
                    />
                  </label>
                ) : null}
              </div>
              {error ? (
                <p className="text-sm text-destructive" role="alert">
                  {error}
                </p>
              ) : null}
            </>
          ) : (
            <div className="space-y-3">
              <p className="text-sm font-medium text-[var(--foreground)]">{labels.linkTitle}</p>
              <p className="text-sm text-[var(--muted)]">{labels.linkExplanation}</p>
              <div className="flex flex-wrap items-center gap-2">
                <code className="max-w-full truncate rounded bg-[var(--surface-1)] px-2 py-1 text-xs">
                  {createdLink}
                </code>
                <Button type="button" variant="secondary" size="sm" onClick={() => void onCopy()}>
                  {copied ? labels.copied : labels.copyLink}
                </Button>
              </div>
            </div>
          )}
          <p className="text-xs text-[var(--muted)]">
            {publishedAtLabel}: {publishedAtFormatted}
          </p>
        </div>
      </Dialog>
    </>
  );
}
