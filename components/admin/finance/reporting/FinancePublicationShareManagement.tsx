"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/Button";
import { SceSegmentedControl } from "@/components/admin/shared/SceSegmentedControl";
import { SceConfirmDialog } from "@/components/sce/actions";
import {
  createFinancePublicationShareAction,
  ensureDefaultFinancePublicationShareAction,
  listFinancePublicationSharesAction,
  revokeFinancePublicationShareAction,
} from "@/app/(admin)/dashboard/finance/reports/publication-share-actions";
import type { FinancePublicationShareListItem } from "@/lib/finance/services/finance-publication-share-service";
import { useToast } from "@/hooks/use-toast";
import {
  buildFinancePublicationShareAbsoluteUrlFromPath,
  formatCompactFinancePublicationShareUrlLabel,
} from "@/lib/finance/presentation/format-finance-publication-share-url-display";

export type FinancePublicationShareManagementLabels = {
  sectionTitle: string;
  dialogTitle: string;
  empty: string;
  noActiveShare: string;
  createDefaultLink: string;
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
  revokeConfirmTitle: string;
  revokeConfirmDescription: string;
  revokeSuccess: string;
  copyLink: string;
  openLink: string;
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
  manageAction: string;
  cancel: string;
};

type Props = {
  publicationId: string;
  versionNumber: number;
  formattingLocale: string;
  labels: FinancePublicationShareManagementLabels;
  canRevoke: boolean;
  canCreateShare?: boolean;
  reloadKey?: number;
  active?: boolean;
  onShareChanged?: () => void;
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

function formatDateTime(iso: string, locale: string): string {
  try {
    return new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeStyle: "short" }).format(
      new Date(iso),
    );
  } catch {
    return iso.slice(0, 16).replace("T", " ");
  }
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
  canCreateShare = false,
  reloadKey = 0,
  active = true,
  onShareChanged,
}: Props) {
  const { toast } = useToast();
  const [shares, setShares] = useState<FinancePublicationShareListItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [revokingId, setRevokingId] = useState<string | null>(null);
  const [revokeTargetId, setRevokeTargetId] = useState<string | null>(null);
  const [creatingDefault, setCreatingDefault] = useState(false);
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
    const timer = window.setTimeout(() => {
      void load();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [active, load, reloadKey]);

  const activeShares = useMemo(
    () => shares.filter((share) => share.status === "ACTIVE"),
    [shares],
  );

  const origin = typeof window !== "undefined" ? window.location.origin : "";

  const onCopy = useCallback(
    async (relativePath: string) => {
      const absolute = buildFinancePublicationShareAbsoluteUrlFromPath({
        origin,
        relativeSharePath: relativePath,
      });
      try {
        await navigator.clipboard.writeText(absolute);
        toast.success(labels.linkCopied);
      } catch {
        toast.danger(labels.loadFailed);
      }
    },
    [labels.linkCopied, labels.loadFailed, origin, toast],
  );

  const onOpenLink = useCallback(
    (relativePath: string) => {
      const absolute = buildFinancePublicationShareAbsoluteUrlFromPath({
        origin,
        relativeSharePath: relativePath,
      });
      window.open(absolute, "_blank", "noopener,noreferrer");
    },
    [origin],
  );

  const performRevoke = useCallback(
    async (shareId: string) => {
      setRevokingId(shareId);
      const result = await revokeFinancePublicationShareAction({ shareId });
      setRevokingId(null);
      setRevokeTargetId(null);
      if (!result.ok) {
        setError(result.error === "REVOKE_FAILED" ? labels.revokeFailed : result.error);
        return;
      }
      toast.success(labels.revokeSuccess);
      onShareChanged?.();
      await load();
    },
    [labels.revokeFailed, labels.revokeSuccess, load, onShareChanged, toast],
  );

  const onCreateDefault = useCallback(async () => {
    setCreatingDefault(true);
    setError(null);
    const result = await ensureDefaultFinancePublicationShareAction({
      publicationId,
      versionNumber,
    });
    setCreatingDefault(false);
    if (!result.ok) {
      setError(result.error === "CREATE_FAILED" ? labels.createFailed : result.error);
      return;
    }
    onShareChanged?.();
    if (result.shareUrlPath) {
      await onCopy(result.shareUrlPath);
    }
    await load();
  }, [labels.createFailed, load, onCopy, onShareChanged, publicationId, versionNumber]);

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
    onShareChanged?.();
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
    onShareChanged,
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
        aria-busy="true"
        aria-live="polite"
      >
        <span className="sr-only">{labels.loadFailed}</span>
      </div>
    );
  }

  return (
    <section className="space-y-4" data-finance-publication-share-management>
      {error ? (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      ) : null}

      {activeShares.length === 0 ? (
        <div className="space-y-3 rounded-md border border-[var(--sce-surface-border-subtle)] p-3">
          <p className="text-sm text-[var(--muted)]">{labels.noActiveShare}</p>
          {canCreateShare ? (
            <Button
              type="button"
              variant="secondary"
              size="sm"
              disabled={creatingDefault}
              onClick={() => void onCreateDefault()}
              data-finance-publication-share-create-default
            >
              {creatingDefault ? labels.creating : labels.createDefaultLink}
            </Button>
          ) : null}
        </div>
      ) : (
        <ul className="divide-y divide-[var(--sce-surface-border-subtle)] rounded-md border border-[var(--sce-surface-border-subtle)]">
          {activeShares.map((share) => (
            <li
              key={share.id}
              className="flex flex-col gap-3 px-3 py-3 text-sm"
              data-finance-publication-share-row
              data-finance-publication-share-status={share.status}
            >
              <div className="space-y-1">
                <p className="font-medium text-[var(--foreground)]">
                  {statusLabel(share.status, labels)}
                </p>
                {share.relativeSharePath ? (
                  <p
                    className="break-all font-mono text-xs text-[var(--foreground)]"
                    data-finance-publication-share-url-display
                  >
                    {formatCompactFinancePublicationShareUrlLabel({
                      origin,
                      relativeSharePath: share.relativeSharePath,
                    })}
                  </p>
                ) : null}
                <p className="text-xs text-[var(--muted)]">
                  {labels.createdLabel}: {formatDateTime(share.createdAt, formattingLocale)}
                  {share.createdByDisplayName
                    ? ` · ${labels.creatorLabel}: ${share.createdByDisplayName}`
                    : null}
                  {share.expiresAt
                    ? ` · ${labels.expiresLabel}: ${formatDate(share.expiresAt, formattingLocale)}`
                    : ` · ${labels.expiresNone}`}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                {share.relativeSharePath ? (
                  <>
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      onClick={() => onOpenLink(share.relativeSharePath!)}
                    >
                      {labels.openLink}
                    </Button>
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      onClick={() => void onCopy(share.relativeSharePath!)}
                    >
                      {labels.copyLink}
                    </Button>
                  </>
                ) : null}
                {canRevoke ? (
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    disabled={revokingId === share.id}
                    onClick={() => setRevokeTargetId(share.id)}
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

      {shares.length > 0 && activeShares.length === 0 && shares.some((s) => s.status !== "ACTIVE") ? (
        <p className="text-xs text-[var(--muted)]">{labels.empty}</p>
      ) : null}

      {canCreateShare ? (
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
      ) : null}

      <SceConfirmDialog
        open={revokeTargetId != null}
        onClose={() => setRevokeTargetId(null)}
        title={labels.revokeConfirmTitle}
        description={labels.revokeConfirmDescription}
        dialogType="DESTRUCTIVE_CONFIRMATION"
        confirmLabel={labels.revoke}
        cancelLabel={labels.cancel}
        confirmLoading={revokingId != null}
        onConfirm={() => {
          if (revokeTargetId) void performRevoke(revokeTargetId);
        }}
      />
    </section>
  );
}
