"use client";

import { useEffect, useState } from "react";
import {
  SceDataTable,
  SceDataTableBody,
  SceDataTableCell,
  SceDataTableHead,
  SceDataTableHeaderCell,
  SceDataTableRow,
  SceDenseSurface,
} from "@/components/sce/dense";
import { SceEmptyState } from "@/components/sce/feedback/SceEmptyState";
import { SceSemanticFeedback } from "@/components/sce/feedback/SceSemanticFeedback";

type AuditLogItem = {
  id: string;
  moduleKey: string;
  entityType: string;
  entityId: string;
  action: string;
  createdAt: string;
  actorName: string | null;
  actorEmail: string | null;
};

function formatDateTime(value: string) {
  const date = new Date(value);

  return new Intl.DateTimeFormat("de-CH", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

export default function AuditLogsTable() {
  const [logs, setLogs] = useState<AuditLogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    async function loadLogs() {
      try {
        const response = await fetch("/api/audit-logs", {
          method: "GET",
          cache: "no-store",
        });

        const data = await response.json().catch(() => null);

        if (!response.ok) {
          throw new Error(data?.error ?? "Audit Logs konnten nicht geladen werden.");
        }

        if (!active) {
          return;
        }

        setLogs(Array.isArray(data) ? data : []);
      } catch (err) {
        if (!active) {
          return;
        }

        setError(
          err instanceof Error ? err.message : "Ein Fehler ist aufgetreten.",
        );
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    loadLogs();

    return () => {
      active = false;
    };
  }, []);

  return (
    <SceDenseSurface feedbackSurfaceId="platform-audit-logs" aria-label="Audit Logs">
      {loading ? (
        <p className="px-4 py-6 text-sm text-[var(--muted)]" data-testid="audit-logs-loading">
          Lade Audit Logs…
        </p>
      ) : null}

      {!loading && error ? (
        <div className="p-4">
          <SceSemanticFeedback
            tone="ERROR"
            title="Audit Logs nicht verfügbar"
            description={error}
          />
        </div>
      ) : null}

      {!loading && !error && logs.length === 0 ? (
        <SceEmptyState
          variant="NO_DATA"
          title="Noch keine Audit Logs vorhanden"
          description="Systemänderungen erscheinen hier, sobald protokollierte Aktionen vorliegen."
          contained
        />
      ) : null}

      {!loading && !error && logs.length > 0 ? (
        <SceDataTable aria-label="Audit Log Einträge" data-testid="platform-audit-logs-table">
          <SceDataTableHead>
            <tr>
              <SceDataTableHeaderCell scope="col">Zeit</SceDataTableHeaderCell>
              <SceDataTableHeaderCell scope="col">Benutzer</SceDataTableHeaderCell>
              <SceDataTableHeaderCell scope="col">Modul</SceDataTableHeaderCell>
              <SceDataTableHeaderCell scope="col">Aktion</SceDataTableHeaderCell>
              <SceDataTableHeaderCell scope="col">Entity</SceDataTableHeaderCell>
            </tr>
          </SceDataTableHead>
          <SceDataTableBody>
            {logs.map((log) => (
              <SceDataTableRow key={log.id}>
                <SceDataTableCell className="text-[var(--text-2)]">
                  {formatDateTime(log.createdAt)}
                </SceDataTableCell>
                <SceDataTableCell>
                  <div className="font-medium text-[var(--foreground)]">
                    {log.actorName ?? "System"}
                  </div>
                  <div className="text-xs text-[var(--muted)]">{log.actorEmail ?? "—"}</div>
                </SceDataTableCell>
                <SceDataTableCell className="text-[var(--text-2)]">{log.moduleKey}</SceDataTableCell>
                <SceDataTableCell className="font-semibold text-[var(--foreground)]">
                  {log.action}
                </SceDataTableCell>
                <SceDataTableCell>
                  <div className="text-[var(--foreground)]">{log.entityType}</div>
                  <div className="text-xs text-[var(--muted)]">{log.entityId}</div>
                </SceDataTableCell>
              </SceDataTableRow>
            ))}
          </SceDataTableBody>
        </SceDataTable>
      ) : null}
    </SceDenseSurface>
  );
}
