"use client";

import { useEffect, useMemo, useState } from "react";
import { Loader2 } from "lucide-react";

export type CommunicationSenderOption = {
  id: string;
  displayName: string;
  emailAddress: string;
  isDefault: boolean;
  providerStatus: string;
  usable: boolean;
};

type ReadinessResponse = {
  usableSenders?: CommunicationSenderOption[];
  senders?: Array<{
    id: string;
    displayName: string;
    emailAddress: string;
    isDefault: boolean;
    providerStatus: string;
    status: string;
  }>;
  readiness?: {
    platformFallbackActive?: boolean;
    ready?: boolean;
  };
};

type Props = {
  value: string | null;
  onChange: (senderIdentityId: string | null) => void;
  disabled?: boolean;
  showOnlyWhenEmail?: boolean;
  emailChannelEnabled?: boolean;
  label?: string;
};

export function CommunicationSenderSelector({
  value,
  onChange,
  disabled = false,
  showOnlyWhenEmail = false,
  emailChannelEnabled = true,
  label = "Absender",
}: Props) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [options, setOptions] = useState<CommunicationSenderOption[]>([]);
  const [platformFallbackActive, setPlatformFallbackActive] = useState(false);

  useEffect(() => {
    if (showOnlyWhenEmail && !emailChannelEnabled) {
      setLoading(false);
      return;
    }

    let cancelled = false;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch("/api/communication/email/senders/readiness");
        if (!res.ok) {
          throw new Error("Absender konnten nicht geladen werden.");
        }
        const data = (await res.json()) as ReadinessResponse;
        const usable =
          data.usableSenders ??
          (data.senders ?? [])
            .filter((s) => s.status === "ACTIVE" && s.providerStatus === "VERIFIED")
            .map((s) => ({
              id: s.id,
              displayName: s.displayName,
              emailAddress: s.emailAddress,
              isDefault: s.isDefault,
              providerStatus: s.providerStatus,
              usable: true,
            }));
        if (!cancelled) {
          setOptions(usable);
          setPlatformFallbackActive(Boolean(data.readiness?.platformFallbackActive));
        }
      } catch (loadError) {
        if (!cancelled) {
          setError(loadError instanceof Error ? loadError.message : "Fehler beim Laden.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [emailChannelEnabled, showOnlyWhenEmail]);

  const selected = useMemo(
    () => options.find((option) => option.id === value) ?? null,
    [options, value],
  );

  if (showOnlyWhenEmail && !emailChannelEnabled) {
    return null;
  }

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-sm text-[var(--muted)]" aria-live="polite">
        <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
        Absender werden geladen…
      </div>
    );
  }

  if (error) {
    return (
      <p className="text-sm text-[var(--sce-danger)]" role="alert">
        {error}
      </p>
    );
  }

  if (options.length === 0) {
    return (
      <div className="rounded-md border border-[var(--border)] p-3 text-sm">
        <p className="font-medium">{label}</p>
        <p className="mt-1 text-[var(--muted)]">
          Kein verifizierter Vereinsabsender — es gilt der SportClubEvo-Fallback, sofern
          konfiguriert.
        </p>
      </div>
    );
  }

  if (options.length === 1) {
    const only = options[0]!;
    return (
      <div className="rounded-md border border-[var(--border)] p-3 text-sm">
        <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-[var(--muted)]">
          {label}
        </p>
        <p className="mt-1 font-medium">{only.displayName}</p>
        <p className="text-[var(--muted)]">{only.emailAddress}</p>
      </div>
    );
  }

  return (
    <div>
      <label htmlFor="communication-sender-select" className="block text-sm font-medium mb-1.5">
        {label}
      </label>
      <select
        id="communication-sender-select"
        className="w-full rounded-md border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm"
        value={value ?? ""}
        disabled={disabled}
        onChange={(event) => onChange(event.target.value || null)}
      >
        {options.map((option) => (
          <option key={option.id} value={option.id}>
            {option.displayName} ({option.emailAddress})
            {option.isDefault ? " — Standard" : ""}
          </option>
        ))}
      </select>
      {platformFallbackActive && !selected ? (
        <p className="mt-1 text-xs text-[var(--muted)]">
          Ohne Auswahl wird der SportClubEvo-Fallback verwendet, wenn kein Standard verifiziert ist.
        </p>
      ) : null}
      {selected && selected.providerStatus !== "VERIFIED" ? (
        <p className="mt-1 text-xs text-[var(--sce-warning)]" role="status">
          Absender ist nicht verifiziert und kann nicht für E-Mail-Versand verwendet werden.
        </p>
      ) : null}
    </div>
  );
}
