"use client";

import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { SceSegmentedControl } from "@/components/admin/shared/SceSegmentedControl";
import {
  createFinancePublicationShareAction,
  listFinancePublicationSharesAction,
  revokeFinancePublicationShareAction,
} from "@/app/(admin)/dashboard/finance/reports/publication-share-actions";
import type { FinancePublicationShareListItem } from "@/lib/finance/services/finance-publication-share-service";
import { useToast } from "@/hooks/use-toast";

export type FinancePublicationShareManagementLabels = {
  sectionTitle: string;
  empty: string;
  statusActive: string;
  statusExpired: string;
  statusRevoked: string;
  createdLabel: string;
  expiresLabel: string;
  expiresNone: string;
  creatorLabel: string;
  revoke: string;
  revoking: string;
  revokeFailed: string;
  copyLink: string;
  linkCopied: string;
  loadFailed: string;
  advancedTitle: string;
  expirySection: string;
  expiryNone: string;
  expiryDate: string;
  expiryDateLabel: string;
  createAdvancedShare: string;
  creating: string;
  createFailed: string;
};

type Props = {
  publicationId: string;
  versionNumber: number;
  formattingLocale: string;
  labels: FinancePublicationShareManagementLabels;
  canRevoke: boolean;
  reloadKey?: number;
  active?: boolean;
};

type ExpiryMode = "NONE" | "DATE";

function statusLabel(
  status: FinancePublicationShareListItem["status"],
  labels: FinancePublicationShareManagementLabels,
): string {
  if (status === "ACTIVE") return labels.statusActive;
  if (status === "EXPIRED") return labels.statusExpired;
  return labels.statusRevoked;
}

function formatDate(iso: string, locale: string): string {
  try {
    return new Intl.DateTimeFormat(locale, { dateStyle: "medium" }).format(new Date(iso));
  } catch {
    return iso.slice(0, 10);
  }
}

export function FinancePublicationShareManagement({
  publicationId,
  versionNumber,
  formattingLocale,
  labels,
  canRevoke,
  reloadKey = 0,
  active = true,
}: Props) {
  const { toast } = useToast();
  const [shares, setShares] = useState<FinancePublicationShareListItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [revokingId, setRevokingId] = useState<string | null>(null);
  const [expiryMode, setExpiryMode] = useState<ExpiryMode>("NONE");
  const [expiresAtDate, setExpiresAtDate] = useState("");
  const [creatingAdvanced, setCreatingAdvanced] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const result = await listFinancePublicationSharesAction({ publicationId, versionNumber });
    setLoading(false);
    setLoaded(true);
    if (!result.ok) {
      setError(result.error === "LOAD_FAILED" ? labels.loadFailed : result.error);
      setShares([]);
      return;
    }
    setShares(result.shares);
  }, [labels.loadFailed, publicationId, versionNumber]);

  useEffect(() => {
    if (!active) return;
    void load();
  }, [active, load, reloadKey]);

  const onCopy = useCallback(
    async (relativePath: string) => {
      const origin = typeof window !== "undefined" ? window.location.origin : "";
      try {
        await navigator.clipboard.writeText(`${origin}${relativePath}`);
        toast.success(labels.linkCopied);
      } catch {
        toast.danger(labels.loadFailed);
      }
    },
    [labels.linkCopied, labels.loadFailed, toast],
  );

  const onRevoke = useCallback(
    async (shareId: string) => {
      setRevokingId(shareId);
      const result = await revokeFinancePublicationShareAction({ shareId });
      setRevokingId(null);
      if (!result.ok) {
        setError(result.error === "REVOKE_FAILED" ? labels.revokeFailed : result.error);
        return;
      }
      await load();
    },
    [labels.revokeFailed, load],
  );

  const onCreateAdvanced = useCallback(async () => {
    setCreatingAdvanced(true);
    setError(null);
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
    setCreatingAdvanced(false);
    if (!result.ok) {
      setError(result.error === "CREATE_FAILED" ? labels.createFailed : result.error);
      return;
    }
    if (result.shareUrlPath) {
      await onCopy(result.shareUrlPath);
    }
    await load();
  }, [
    expiryMode,
    expiresAtDate,
    labels.createFailed,
    load,
    onCopy,
    publicationId,
    versionNumber,
  ]);

  if (!active) {
    return null;
  }

  if (loading && !loaded) {
    return (
      <div
        className="h-16 animate-pulse rounded-md bg-[var(--surface-1)]"
        data-finance-publication-share-management-loading
        aria-hidden
      />
    );
  }

  return (
    <section className="space-y-4" data-finance-publication-share-management>
      <h3 className="text-sm font-semibold text-[var(--foreground)]">{labels.sectionTitle}</h3>
      {error ? (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      ) : null}
      {shares.length === 0 ? (
        <p className="text-sm text-[var(--muted)]">{labels.empty}</p>
      ) : (
        <ul className="divide-y divide-[var(--sce-surface-border-subtle)] rounded-md border border-[var(--sce-surface-border-subtle)]">
          {shares.map((share) => (
            <li
              key={share.id}
              className="flex flex-col gap-2 px-3 py-3 text-sm sm:flex-row sm:items-center sm:justify-between"
              data-finance-publication-share-row
              data-finance-publication-share-status={share.status}
            >
              <div className="space-y-0.5">
                <p className="font-medium text-[var(--foreground)]">
                  {statusLabel(share.status, labels)}
                </p>
                <p className="text-xs text-[var(--muted)]">
                  {labels.createdLabel}: {formatDate(share.createdAt, formattingLocale)}
                  {share.createdByDisplayName
                    ? ` · ${labels.creatorLabel}: ${share.createdByDisplayName}`
                    : null}
                  {share.expiresAt
                    ? ` · ${labels.expiresLabel}: ${formatDate(share.expiresAt, formattingLocale)}`
                    : ` · ${labels.expiresNone}`}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                {share.relativeSharePath && share.status === "ACTIVE" ? (
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={() => void onCopy(share.relativeSharePath!)}
                  >
                    {labels.copyLink}
                  </Button>
                ) : null}
                {canRevoke && share.status === "ACTIVE" ? (
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    disabled={revokingId === share.id}
                    onClick={() => void onRevoke(share.id)}
                    data-finance-publication-share-revoke
                  >
                    {revokingId === share.id ? labels.revoking : labels.revoke}
                  </Button>
                ) : null}
              </div>
            </li>
          ))}
        </ul>
      )}

      <div className="space-y-3 rounded-md border border-[var(--sce-surface-border-subtle)] p-3">
        <p className="text-sm font-medium text-[var(--foreground)]">{labels.advancedTitle}</p>
        <p className="text-xs text-[var(--muted)]">{labels.expirySection}</p>
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
        <Button
          type="button"
          variant="secondary"
          size="sm"
          disabled={creatingAdvanced || expiryMode !== "DATE" || !expiresAtDate}
          onClick={() => void onCreateAdvanced()}
        >
          {creatingAdvanced ? labels.creating : labels.createAdvancedShare}
        </Button>
      </div>
    </section>
  );
}
