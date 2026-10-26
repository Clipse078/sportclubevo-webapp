"use client";

import { useCallback, useMemo, useState } from "react";
import { Dialog } from "@/components/ui/Dialog";
import { Button } from "@/components/ui/Button";
import {
  FinancePublicationDistributionRecipientPicker,
  type FinancePublicationDistributionRecipientPickerLabels,
} from "@/components/admin/finance/reporting/FinancePublicationDistributionRecipientPicker";
import {
  sendFinancePublicationDistributionAction,
  loadFinancePublicationDistributionHistoryAction,
  loadFinancePublicationDistributionDetailAction,
} from "@/app/(admin)/dashboard/finance/reports/publication-distribution-actions";
import type { FinancePublicationDistributionRecipientInput } from "@/lib/finance/publishing/finance-publication-distribution-contract";
import type { FinancePublicationDistributionSummary } from "@/lib/finance/services/finance-publication-distribution-service";

export type FinancePublicationDistributionLabels = {
  dialogTitle: string;
  sendAction: string;
  historyAction: string;
  historyTitle: string;
  historyEmpty: string;
  historyLoadFailed?: string;
  optionalMessageLabel: string;
  optionalMessagePlaceholder: string;
  reviewHeading: string;
  reviewVersion: string;
  reviewRecipients: string;
  reviewMessage: string;
  reviewMessageEmpty: string;
  sendConfirm: string;
  sending: string;
  sendSuccess: string;
  sendPartial: string;
  sendFailed: string;
  cancel?: string;
  close?: string;
  loadingHistory: string;
  recipientPicker: FinancePublicationDistributionRecipientPickerLabels;
  statusCompleted: string;
  statusPartial: string;
  statusFailed: string;
  distributionSummary: string;
  viewRecipients: string;
  recipientSent: string;
  recipientFailed: string;
  externalRecipient: string;
};

type Props = {
  open: boolean;
  onClose: () => void;
  publicationId: string;
  versionNumber: number;
  financeYearName: string;
  publishedAtLabel: string;
  formattingLocale: string;
  labels: FinancePublicationDistributionLabels;
};

function formatWhen(iso: string, locale: string): string {
  try {
    return new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeStyle: "short" }).format(
      new Date(iso),
    );
  } catch {
    return iso.slice(0, 16).replace("T", " ");
  }
}

export function FinancePublicationDistributionDialog({
  open,
  onClose,
  publicationId,
  versionNumber,
  financeYearName,
  publishedAtLabel,
  formattingLocale,
  labels,
}: Props) {
  const [mode, setMode] = useState<"send" | "history">("send");
  const [recipients, setRecipients] = useState<FinancePublicationDistributionRecipientInput[]>([]);
  const [optionalMessage, setOptionalMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [history, setHistory] = useState<FinancePublicationDistributionSummary[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState<string | null>(null);
  const [expandedDistributionId, setExpandedDistributionId] = useState<string | null>(null);
  const [expandedLoading, setExpandedLoading] = useState(false);
  const [expandedRecipients, setExpandedRecipients] = useState<
    Array<{
      id: string;
      label: string;
      status: string;
      isExternal: boolean;
    }>
  >([]);

  const idempotencyKey = useMemo(() => {
    if (!open) return "";
    return `fin-dist-${publicationId}-v${versionNumber}-${crypto.randomUUID()}`;
  }, [open, publicationId, versionNumber]);

  const resetState = useCallback(() => {
    setMode("send");
    setRecipients([]);
    setOptionalMessage("");
    setError(null);
    setSuccess(null);
    setHistory([]);
    setHistoryError(null);
    setExpandedDistributionId(null);
    setExpandedRecipients([]);
  }, []);

  const handleClose = useCallback(() => {
    resetState();
    onClose();
  }, [onClose, resetState]);

  const loadHistory = useCallback(async () => {
    setHistoryLoading(true);
    setHistoryError(null);
    const result = await loadFinancePublicationDistributionHistoryAction({
      publicationId,
      versionNumber,
    });
    setHistoryLoading(false);
    if (!result.ok) {
      setHistoryError(result.error);
      setHistory([]);
      return;
    }
    setHistory(result.distributions);
  }, [publicationId, versionNumber]);

  const openHistory = useCallback(() => {
    setMode("history");
    void loadHistory();
  }, [loadHistory]);

  const sendDistribution = useCallback(async () => {
    setSending(true);
    setError(null);
    setSuccess(null);
    try {
      const result = await sendFinancePublicationDistributionAction({
        publicationId,
        versionNumber,
        idempotencyKey,
        optionalMessage,
        recipients,
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      if (result.failedCount > 0 && result.sentCount > 0) {
        setSuccess(labels.sendPartial);
      } else if (result.failedCount > 0) {
        setError(result.userMessage ?? labels.sendFailed);
      } else {
        setSuccess(labels.sendSuccess);
      }
    } catch {
      setError(labels.sendFailed);
    } finally {
      setSending(false);
    }
  }, [
    idempotencyKey,
    labels.sendFailed,
    labels.sendPartial,
    labels.sendSuccess,
    optionalMessage,
    publicationId,
    recipients,
    versionNumber,
  ]);

  const loadExpanded = useCallback(
    async (distributionId: string) => {
      if (expandedDistributionId === distributionId) {
        setExpandedDistributionId(null);
        setExpandedRecipients([]);
        return;
      }
      setExpandedDistributionId(distributionId);
      setExpandedLoading(true);
      const result = await loadFinancePublicationDistributionDetailAction({ distributionId });
      setExpandedLoading(false);
      if (!result.ok) {
        setHistoryError(result.error);
        return;
      }
      setExpandedRecipients(
        result.detail.recipients.map((row) => ({
          id: row.id,
          label: row.recipientDisplayName ?? row.recipientEmailMasked,
          status: row.status,
          isExternal: row.isExternalRecipient,
        })),
      );
    },
    [expandedDistributionId],
  );

  const reviewVersionLine = labels.reviewVersion
    .replace("{version}", String(versionNumber))
    .replace("{year}", financeYearName)
    .replace("{publishedAt}", publishedAtLabel);

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      title={mode === "send" ? labels.dialogTitle : labels.historyTitle}
      panelClassName="w-full sm:max-w-lg"
      footer={
        <div className="flex flex-wrap justify-end gap-2">
          {mode === "send" ? (
            <>
              <Button type="button" variant="secondary" onClick={openHistory}>
                {labels.historyAction}
              </Button>
              <Button type="button" variant="secondary" onClick={handleClose}>
                {labels.cancel ?? labels.close ?? "Close"}
              </Button>
              <Button
                type="button"
                disabled={sending || recipients.length === 0}
                onClick={() => void sendDistribution()}
                data-finance-publication-distribution-send
              >
                {sending ? labels.sending : labels.sendConfirm}
              </Button>
            </>
          ) : (
            <>
              <Button type="button" variant="secondary" onClick={() => setMode("send")}>
                {labels.sendAction}
              </Button>
              <Button type="button" variant="secondary" onClick={handleClose}>
                {labels.close ?? "Close"}
              </Button>
            </>
          )}
        </div>
      }
    >
      {mode === "send" ? (
        <div className="flex flex-col gap-5" data-finance-publication-distribution-send-panel>
          <section aria-labelledby="finance-distribution-review-heading">
            <h3
              id="finance-distribution-review-heading"
              className="text-sm font-semibold text-[var(--foreground)]"
            >
              {labels.reviewHeading}
            </h3>
            <p className="mt-1 text-sm text-[var(--muted)]">{reviewVersionLine}</p>
            <p className="mt-1 text-sm text-[var(--muted)]">
              {labels.reviewRecipients.replace("{count}", String(recipients.length))}
            </p>
          </section>

          <FinancePublicationDistributionRecipientPicker
            labels={labels.recipientPicker}
            value={recipients}
            onChange={setRecipients}
            disabled={sending}
          />

          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium" htmlFor="finance-distribution-message">
              {labels.optionalMessageLabel}
            </label>
            <textarea
              id="finance-distribution-message"
              value={optionalMessage}
              disabled={sending}
              maxLength={500}
              rows={3}
              placeholder={labels.optionalMessagePlaceholder}
              onChange={(event) => setOptionalMessage(event.target.value)}
              className="min-h-[5rem] w-full rounded-md border border-[var(--border)] bg-[var(--surface-1)] px-3 py-2 text-sm text-[var(--foreground)]"
            />
          </div>

          {optionalMessage.trim() ? (
            <p className="text-xs text-[var(--muted)]">
              {labels.reviewMessage}: {optionalMessage.trim()}
            </p>
          ) : (
            <p className="text-xs text-[var(--muted)]">{labels.reviewMessageEmpty}</p>
          )}

          {error ? (
            <p className="text-sm text-destructive" role="alert">
              {error}
            </p>
          ) : null}
          {success ? (
            <p className="text-sm text-[var(--foreground)]" role="status">
              {success}
            </p>
          ) : null}
        </div>
      ) : (
        <div className="flex flex-col gap-3" data-finance-publication-distribution-history-panel>
          {historyLoading ? (
            <p className="text-sm text-[var(--muted)]">{labels.loadingHistory}</p>
          ) : null}
          {historyError ? (
            <p className="text-sm text-destructive" role="alert">
              {historyError}
            </p>
          ) : null}
          {!historyLoading && history.length === 0 && !historyError ? (
            <p className="text-sm text-[var(--muted)]">{labels.historyEmpty}</p>
          ) : null}
          <ul className="divide-y divide-[var(--sce-surface-border-subtle)]" role="list">
            {history.map((row) => {
              const summary = labels.distributionSummary
                .replace("{date}", formatWhen(row.createdAt, formattingLocale))
                .replace("{total}", String(row.recipientCount))
                .replace("{sent}", String(row.sentCount))
                .replace("{failed}", String(row.failedCount));
              return (
                <li key={row.id} className="py-3">
                  <div className="flex flex-col gap-2">
                    <p className="text-sm font-medium text-[var(--foreground)]">{summary}</p>
                    <p className="text-xs text-[var(--muted)]">{row.status}</p>
                    <Button
                      type="button"
                      size="sm"
                      variant="secondary"
                      onClick={() => void loadExpanded(row.id)}
                    >
                      {labels.viewRecipients}
                    </Button>
                    {expandedDistributionId === row.id ? (
                      expandedLoading ? (
                        <p className="text-xs text-[var(--muted)]">{labels.loadingHistory}</p>
                      ) : (
                        <ul className="mt-1 space-y-1 text-xs text-[var(--muted)]" role="list">
                          {expandedRecipients.map((recipient) => (
                            <li key={recipient.id}>
                              {recipient.label}
                              {recipient.isExternal ? ` (${labels.externalRecipient})` : ""} —{" "}
                              {recipient.status === "SENT"
                                ? labels.recipientSent
                                : labels.recipientFailed}
                            </li>
                          ))}
                        </ul>
                      )
                    ) : null}
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </Dialog>
  );
}
