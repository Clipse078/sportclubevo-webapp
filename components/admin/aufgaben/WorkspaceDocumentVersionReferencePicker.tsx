"use client";

import { useCallback, useEffect, useState, useTransition } from "react";
import { FileText, Loader2 } from "lucide-react";
import type { WorkspaceDocumentPickerOption } from "@/lib/workspace/document-access";

type VersionOption = {
  id: string;
  versionNumber: number;
  filename: string;
  createdAt: string;
};

type Props = {
  disabled?: boolean;
  searchAction: (query: string) => Promise<
    | { ok: true; options: WorkspaceDocumentPickerOption[] }
    | { ok: false; message: string }
  >;
  listVersionsAction: (
    documentId: string,
  ) => Promise<
    | {
        ok: true;
        currentVersionId: string | null;
        versions: VersionOption[];
      }
    | { ok: false }
  >;
  onConfirm: (input: { documentId: string; workspaceDocumentVersionId: string }) => void;
  testIdPrefix?: string;
};

export function WorkspaceDocumentVersionReferencePicker({
  disabled,
  searchAction,
  listVersionsAction,
  onConfirm,
  testIdPrefix = "workspace-version-ref",
}: Props) {
  const [query, setQuery] = useState("");
  const [options, setOptions] = useState<WorkspaceDocumentPickerOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedDocumentId, setSelectedDocumentId] = useState<string | null>(null);
  const [versions, setVersions] = useState<VersionOption[]>([]);
  const [currentVersionId, setCurrentVersionId] = useState<string | null>(null);
  const [selectedVersionId, setSelectedVersionId] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const loadOptions = useCallback(
    async (search: string) => {
      setLoading(true);
      setError(null);
      try {
        const result = await searchAction(search);
        if (!result.ok) {
          setOptions([]);
          setError(result.message);
          return;
        }
        setOptions(result.options);
      } finally {
        setLoading(false);
      }
    },
    [searchAction],
  );

  useEffect(() => {
    const handle = window.setTimeout(() => {
      void loadOptions(query);
    }, 250);
    return () => window.clearTimeout(handle);
  }, [query, loadOptions]);

  function selectDocument(documentId: string) {
    setSelectedDocumentId(documentId);
    setVersions([]);
    setSelectedVersionId(null);
    startTransition(async () => {
      const result = await listVersionsAction(documentId);
      if (!result.ok) {
        setError("Versionen konnten nicht geladen werden.");
        return;
      }
      setVersions(result.versions);
      setCurrentVersionId(result.currentVersionId);
      const defaultVersion =
        result.currentVersionId ??
        result.versions[0]?.id ??
        null;
      setSelectedVersionId(defaultVersion);
    });
  }

  function confirmLink() {
    if (!selectedDocumentId || !selectedVersionId) return;
    onConfirm({
      documentId: selectedDocumentId,
      workspaceDocumentVersionId: selectedVersionId,
    });
  }

  return (
    <div
      className="space-y-2 rounded-md border border-[var(--border)]/60 bg-[var(--surface)] p-2.5"
      data-testid={`${testIdPrefix}-picker`}
    >
      <input
        type="search"
        className="fca-input w-full text-sm"
        placeholder="Dokument suchen…"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        data-testid={`${testIdPrefix}-picker-search`}
      />
      {loading ? (
        <p className="flex items-center gap-2 text-xs text-[var(--muted)]">
          <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
          Suche…
        </p>
      ) : null}
      {!loading && !selectedDocumentId && options.length === 0 ? (
        <p className="text-xs text-[var(--muted)]">Keine Dokumente gefunden.</p>
      ) : null}
      {!selectedDocumentId ? (
        <ul className="max-h-48 space-y-1 overflow-y-auto">
          {options.map((option) => (
            <li key={option.id}>
              <button
                type="button"
                className="flex w-full items-start gap-2 rounded-md px-2 py-1.5 text-left text-sm hover:bg-[var(--surface-2)]"
                disabled={disabled || pending}
                onClick={() => selectDocument(option.id)}
                data-testid={`${testIdPrefix}-picker-option-${option.id}`}
              >
                <FileText className="mt-0.5 h-4 w-4 shrink-0 text-[var(--muted)]" aria-hidden="true" />
                <span className="min-w-0">
                  <span className="block font-medium text-[var(--foreground)]">{option.title}</span>
                  {option.folderBreadcrumb ? (
                    <span className="block truncate text-xs text-[var(--muted)]">
                      {option.folderBreadcrumb}
                    </span>
                  ) : null}
                </span>
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <div className="space-y-2">
          <p className="text-xs text-[var(--muted)]">
            Version wählen — es wird die gewählte Version dauerhaft verknüpft (nicht automatisch die
            neueste).
          </p>
          <select
            className="fca-input w-full text-sm"
            value={selectedVersionId ?? ""}
            onChange={(e) => setSelectedVersionId(e.target.value || null)}
            data-testid={`${testIdPrefix}-version-select`}
          >
            {versions.map((version) => (
              <option key={version.id} value={version.id}>
                Version {version.versionNumber}
                {version.id === currentVersionId ? " · aktuell" : ""} · {version.filename}
              </option>
            ))}
          </select>
          <div className="flex gap-2">
            <button
              type="button"
              className="rounded-md border border-[var(--border)] px-2 py-1 text-xs"
              onClick={() => {
                setSelectedDocumentId(null);
                setVersions([]);
                setSelectedVersionId(null);
              }}
            >
              Zurück
            </button>
            <button
              type="button"
              className="rounded-md bg-[var(--sce-primary)] px-2 py-1 text-xs text-white"
              disabled={disabled || pending || !selectedVersionId}
              onClick={confirmLink}
              data-testid={`${testIdPrefix}-confirm`}
            >
              Verknüpfen
            </button>
          </div>
        </div>
      )}
      {error ? (
        <p className="text-xs text-red-300" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
