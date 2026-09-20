"use client";

import { useCallback, useEffect, useState } from "react";
import type { TaskContextType } from "@prisma/client";
import { SUPPORTED_TASK_CONTEXT_TYPES, taskContextTypeLabel } from "@/lib/tasks/context-registry";

type Props = {
  initialContextType?: TaskContextType | null;
  initialContextId?: string | null;
  initialContextLabel?: string | null;
  disabled?: boolean;
};

export default function TaskContextField({
  initialContextType = null,
  initialContextId = null,
  initialContextLabel = null,
  disabled = false,
}: Props) {
  const [contextType, setContextType] = useState<TaskContextType | "">(
    initialContextType ?? "",
  );
  const [contextId, setContextId] = useState(initialContextId ?? "");
  const [selectedLabel, setSelectedLabel] = useState(initialContextLabel ?? "");
  const [query, setQuery] = useState("");
  const [options, setOptions] = useState<
    Array<{ id: string; label: string; secondary: string | null }>
  >([]);
  const [loading, setLoading] = useState(false);

  const loadOptions = useCallback(async (type: TaskContextType, search: string) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ contextType: type, q: search });
      const res = await fetch(`/api/tasks/context-options?${params.toString()}`);
      if (!res.ok) {
        setOptions([]);
        return;
      }
      const body = (await res.json()) as {
        options: Array<{ id: string; label: string; secondary: string | null }>;
      };
      setOptions(body.options ?? []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!contextType) {
      setOptions([]);
      return;
    }
    const handle = window.setTimeout(() => {
      void loadOptions(contextType, query);
    }, 250);
    return () => window.clearTimeout(handle);
  }, [contextType, query, loadOptions]);

  function onTypeChange(next: string) {
    if (!next) {
      setContextType("");
      setContextId("");
      setSelectedLabel("");
      setQuery("");
      return;
    }
    setContextType(next as TaskContextType);
    setContextId("");
    setSelectedLabel("");
    setQuery("");
  }

  return (
    <div className="space-y-2" data-testid="task-context-field">
      <label className="block space-y-1">
        <span className="text-xs font-medium text-[var(--text-2)]">Kontext (optional)</span>
        <select
          name="contextType"
          className="fca-input w-full text-sm"
          value={contextType}
          disabled={disabled}
          onChange={(e) => onTypeChange(e.target.value)}
        >
          <option value="">Kein Kontext</option>
          {SUPPORTED_TASK_CONTEXT_TYPES.map((type) => (
            <option key={type} value={type}>
              {taskContextTypeLabel(type)}
            </option>
          ))}
        </select>
      </label>

      {contextType ? (
        <div className="space-y-1">
          <input type="hidden" name="contextId" value={contextId} />
          <label className="block space-y-1">
            <span className="text-xs font-medium text-[var(--text-2)]">
              {taskContextTypeLabel(contextType)} suchen
            </span>
            <input
              className="fca-input w-full text-sm"
              value={query}
              disabled={disabled}
              placeholder="Suchen …"
              onChange={(e) => setQuery(e.target.value)}
              data-testid="task-context-search"
            />
          </label>
          {selectedLabel ? (
            <p className="text-xs text-[var(--text-2)]">
              Ausgewählt: <span className="font-medium">{selectedLabel}</span>
              {!disabled ? (
                <button
                  type="button"
                  className="ml-2 text-[var(--muted)] hover:text-[var(--foreground)]"
                  onClick={() => {
                    setContextId("");
                    setSelectedLabel("");
                  }}
                >
                  Entfernen
                </button>
              ) : null}
            </p>
          ) : null}
          <ul
            className="max-h-40 overflow-y-auto rounded-md border border-[var(--border)]/70"
            role="listbox"
            aria-label="Kontext auswählen"
          >
            {loading ? (
              <li className="px-3 py-2 text-xs text-[var(--muted)]">Laden …</li>
            ) : options.length === 0 ? (
              <li className="px-3 py-2 text-xs text-[var(--muted)]">Keine Treffer</li>
            ) : (
              options.map((opt) => (
                <li key={opt.id}>
                  <button
                    type="button"
                    role="option"
                    aria-selected={contextId === opt.id}
                    className="flex w-full flex-col px-3 py-2 text-left text-sm hover:bg-[var(--surface-2)]"
                    onClick={() => {
                      setContextId(opt.id);
                      setSelectedLabel(opt.label);
                    }}
                  >
                    <span className="font-medium text-[var(--foreground)]">{opt.label}</span>
                    {opt.secondary ? (
                      <span className="text-xs text-[var(--muted)]">{opt.secondary}</span>
                    ) : null}
                  </button>
                </li>
              ))
            )}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
