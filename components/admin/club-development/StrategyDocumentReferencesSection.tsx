"use client";

import Link from "next/link";
import { FileText, Plus, X } from "lucide-react";
import { useEffect, useState, useTransition } from "react";
import type { ClubStrategyDocumentReferenceDto } from "@/lib/club-development/club-strategy-service";
import { CD_STRATEGY_AUTHORING_COPY } from "@/lib/club-development/product-copy";
import { WorkspaceDocumentVersionReferencePicker } from "@/components/admin/aufgaben/WorkspaceDocumentVersionReferencePicker";
import type { WorkspaceDocumentPickerOption } from "@/lib/workspace/document-access";

type Props = {
  references: ClubStrategyDocumentReferenceDto[];
  canManage: boolean;
  editing?: boolean;
  compact?: boolean;
  onReferencesChanged?: (references: ClubStrategyDocumentReferenceDto[]) => void;
};

type DocKind = "LEITBILD" | "STRATEGY_AGREED" | "SUPPORTING";

const KIND_OPTIONS: { value: DocKind; label: string }[] = [
  { value: "LEITBILD", label: CD_STRATEGY_AUTHORING_COPY.docKindLeitbild },
  { value: "STRATEGY_AGREED", label: CD_STRATEGY_AUTHORING_COPY.docKindStrategy },
  { value: "SUPPORTING", label: CD_STRATEGY_AUTHORING_COPY.docKindSupporting },
];

function kindLabel(kind: DocKind): string {
  return KIND_OPTIONS.find((k) => k.value === kind)?.label ?? kind;
}

async function searchDocuments(query: string) {
  const params = new URLSearchParams({ mode: "search", q: query });
  const res = await fetch(`/api/club-development/club-strategy/document-references?${params}`);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    return { ok: false as const, message: typeof data.error === "string" ? data.error : "Suche fehlgeschlagen." };
  }
  return { ok: true as const, options: (data.options ?? []) as WorkspaceDocumentPickerOption[] };
}

async function listVersions(documentId: string) {
  const params = new URLSearchParams({ mode: "versions", documentId });
  const res = await fetch(`/api/club-development/club-strategy/document-references?${params}`);
  const data = await res.json().catch(() => ({}));
  if (!res.ok || data.ok === false) return { ok: false as const };
  return {
    ok: true as const,
    currentVersionId: data.currentVersionId as string | null,
    versions: data.versions as {
      id: string;
      versionNumber: number;
      filename: string;
      createdAt: string;
    }[],
  };
}

export default function StrategyDocumentReferencesSection({
  references,
  canManage,
  editing = false,
  compact = false,
  onReferencesChanged,
}: Props) {
  const [rows, setRows] = useState(references);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [kind, setKind] = useState<DocKind>("SUPPORTING");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const manageLinks = canManage && editing;

  useEffect(() => {
    setRows(references);
  }, [references]);

  useEffect(() => {
    onReferencesChanged?.(rows);
  }, [onReferencesChanged, rows]);

  async function refreshReferencesFromServer() {
    const res = await fetch("/api/club-development/club-strategy");
    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data.authoring) return;
    setRows(data.authoring.documentReferences ?? []);
  }

  function linkDocument(input: { documentId: string; workspaceDocumentVersionId: string }) {
    startTransition(async () => {
      const res = await fetch("/api/club-development/club-strategy/document-references", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...input, kind }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(typeof data.error === "string" ? data.error : "Verknüpfung fehlgeschlagen.");
        return;
      }
      setPickerOpen(false);
      setError(null);
      await refreshReferencesFromServer();
    });
  }

  function unlinkReference(referenceId: string) {
    startTransition(async () => {
      const res = await fetch(
        `/api/club-development/club-strategy/document-references?referenceId=${encodeURIComponent(referenceId)}`,
        { method: "DELETE" },
      );
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(typeof data.error === "string" ? data.error : "Entfernen fehlgeschlagen.");
        return;
      }
      setRows((prev) => prev.filter((row) => row.referenceId !== referenceId));
    });
  }

  const wrapperClass = compact ? "space-y-2" : "rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-sm";
  const Tag = compact ? "div" : "section";

  return (
    <Tag className={wrapperClass} data-testid="strategy-document-references">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h4 className="text-xs font-semibold text-[var(--foreground)]">
          {CD_STRATEGY_AUTHORING_COPY.documentsHeading}
        </h4>
        {manageLinks ? (
          <button
            type="button"
            className="inline-flex items-center gap-1 text-xs text-[var(--sce-primary)] hover:underline"
            onClick={() => setPickerOpen((v) => !v)}
            data-testid="strategy-document-link-open"
          >
            <Plus className="h-3 w-3" aria-hidden />
            Dokument verknüpfen
          </button>
        ) : null}
      </div>

      {error ? (
        <p className="rounded-md border border-rose-300 bg-rose-50 px-3 py-2 text-sm text-rose-900" role="alert">
          {error}
        </p>
      ) : null}

      {rows.length === 0 ? (
        <p className="text-xs text-[var(--muted)]">{CD_STRATEGY_AUTHORING_COPY.documentsEmpty}</p>
      ) : (
        <ul className="space-y-1.5">
          {rows.map((ref) => {
            const presentation = ref.presentation;
            return (
              <li
                key={ref.referenceId}
                className="flex flex-wrap items-center gap-2 rounded-md border border-[var(--border)]/60 bg-[var(--surface-2)]/30 px-2.5 py-1.5"
                data-testid={`strategy-doc-row-${ref.referenceId}`}
              >
                <span className="text-[9px] font-semibold uppercase tracking-wide text-[var(--muted)]">
                  {kindLabel(ref.kind)}
                </span>
                {presentation.accessible === false ? (
                  <span className="flex items-center gap-1.5 text-xs text-[var(--text-2)]">
                    <FileText className="h-3.5 w-3.5 text-[var(--muted)]" aria-hidden />
                    Dokument (kein Zugriff)
                  </span>
                ) : presentation.accessible === "legacy_unresolved" ? (
                  <span className="text-xs text-[var(--foreground)]">{presentation.documentTitle}</span>
                ) : (
                  <Link
                    href={presentation.canonicalWorkspaceUrl}
                    className="flex min-w-0 flex-1 items-center gap-1.5 text-xs font-medium text-[var(--sce-primary)] hover:underline"
                  >
                    <FileText className="h-3.5 w-3.5 shrink-0" aria-hidden />
                    <span className="truncate">
                      {presentation.documentTitle} · v{presentation.versionNumber}
                    </span>
                  </Link>
                )}
                {manageLinks ? (
                  <button
                    type="button"
                    className="ml-auto rounded p-0.5 text-[var(--muted)] hover:text-rose-700"
                    aria-label="Verknüpfung entfernen"
                    disabled={pending}
                    onClick={() => unlinkReference(ref.referenceId)}
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                ) : null}
              </li>
            );
          })}
        </ul>
      )}

      {manageLinks && pickerOpen ? (
        <div className="mt-2 space-y-2 rounded-lg border border-dashed border-[var(--border)] p-2.5">
          <label className="block text-[10px] font-semibold uppercase tracking-wide text-[var(--muted)]">
            Kategorie
          </label>
          <select
            value={kind}
            onChange={(e) => setKind(e.target.value as DocKind)}
            className="w-full rounded-lg border border-[var(--border)] bg-[var(--surface-2)] px-2.5 py-1.5 text-sm"
          >
            {KIND_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
          <WorkspaceDocumentVersionReferencePicker
            disabled={pending}
            searchAction={searchDocuments}
            listVersionsAction={listVersions}
            onConfirm={linkDocument}
            testIdPrefix="strategy-doc"
          />
        </div>
      ) : null}
    </Tag>
  );
}