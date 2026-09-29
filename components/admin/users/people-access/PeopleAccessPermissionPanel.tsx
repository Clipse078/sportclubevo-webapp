"use client";

import { useMemo } from "react";
import NavAlignedPermissionEditor, {
  type PermissionMatrixModuleGroup,
} from "@/components/admin/roles/NavAlignedPermissionEditor";
import {
  buildNavPermissionPresentationFromModuleGroups,
  buildNavPermissionSummary,
} from "@/lib/roles/nav-permission-presentation";
import { collectAllGrantableKeys } from "@/lib/roles/permission-section-presentation";

export type PeopleAccessPermissionPanelProps = {
  moduleGroups: PermissionMatrixModuleGroup[];
  permissionKeys: readonly string[];
  roleNamesByKey: Readonly<Record<string, readonly string[]>>;
  /** When false, switches reflect role baseline only (no per-user overrides yet). */
  interactive?: boolean;
  primaryRoleLabel?: string;
  scopeLabel?: string;
  className?: string;
};

function countGrantStates(moduleGroups: PermissionMatrixModuleGroup[], selected: Set<string>) {
  const presentation = buildNavPermissionPresentationFromModuleGroups(moduleGroups);
  const all = collectAllGrantableKeys(presentation.sections, presentation.supplementalUnit);
  const granted = all.filter((k) => selected.has(k)).length;
  return { granted, total: all.length };
}

export default function PeopleAccessPermissionPanel({
  moduleGroups,
  permissionKeys,
  roleNamesByKey,
  interactive = false,
  primaryRoleLabel,
  scopeLabel,
  className = "",
}: PeopleAccessPermissionPanelProps) {
  const selectedKeys = useMemo(() => new Set(permissionKeys), [permissionKeys]);
  const presentation = useMemo(
    () => buildNavPermissionPresentationFromModuleGroups(moduleGroups),
    [moduleGroups],
  );
  const counts = useMemo(
    () => countGrantStates(moduleGroups, selectedKeys),
    [moduleGroups, selectedKeys],
  );
  const navSummary = useMemo(
    () => buildNavPermissionSummary(presentation, selectedKeys),
    [presentation, selectedKeys],
  );

  const overrideCount = 0;

  return (
    <div className={`space-y-4 ${className}`}>
      {(primaryRoleLabel || scopeLabel) && (
        <dl className="grid gap-3 rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface-2)] p-4 text-sm sm:grid-cols-2">
          {primaryRoleLabel ? (
            <div>
              <dt className="text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">Funktion</dt>
              <dd className="mt-0.5 font-medium">{primaryRoleLabel}</dd>
            </div>
          ) : null}
          {scopeLabel ? (
            <div>
              <dt className="text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">Bereich</dt>
              <dd className="mt-0.5 font-medium">{scopeLabel}</dd>
            </div>
          ) : null}
          <div>
            <dt className="text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">Zugriff aus Rolle</dt>
            <dd className="mt-0.5">{counts.granted} freigegeben</dd>
          </div>
          <div>
            <dt className="text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">
              Individuelle Anpassungen
            </dt>
            <dd className="mt-0.5">{overrideCount}</dd>
          </div>
        </dl>
      )}

      {!interactive ? (
        <p className="rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2 text-xs text-[var(--muted)]">
          Die gewählte Funktion definiert den empfohlenen Zugriff. Fehlende Berechtigungen sind normal
          (Least Privilege). Individuelle Freigaben oder Entzüge pro Person erfordern die
          Backend-Erweiterung für Overrides — hier siehst du den effektiven Rollen-Stand.
        </p>
      ) : null}

      <NavAlignedPermissionEditor
        moduleGroups={moduleGroups}
        selectedKeys={selectedKeys}
        onChange={() => {}}
        disabled={!interactive}
        peopleAccessMode
        sectionsInitiallyExpanded={false}
      />

      {navSummary.length > 0 ? (
        <ul className="space-y-1 text-xs text-[var(--muted)]" aria-label="Kurzüberblick nach Produktbereich">
          {navSummary.map((section) => {
            const itemsWithAccess = section.items.filter((i) => i.access !== "Kein Zugriff");
            const summary =
              itemsWithAccess.length === 0
                ? "Kein Zugriff"
                : itemsWithAccess.length === section.items.length
                  ? "Vollständig"
                  : `${itemsWithAccess.length} von ${section.items.length} freigegeben`;
            return (
              <li key={section.label}>
                <span className="font-medium text-[var(--foreground)]">{section.label}</span>: {summary}
              </li>
            );
          })}
        </ul>
      ) : null}

      {Object.keys(roleNamesByKey).length > 0 ? (
        <p className="text-xs text-[var(--muted)]">
          Berechtigungen stammen aus den zugewiesenen Funktionen (Rollen-Baseline).
        </p>
      ) : null}
    </div>
  );
}
