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

  const provenanceSample = useMemo(() => {
    const entries = Object.entries(roleNamesByKey);
    if (entries.length === 0) return null;
    const [key, roles] = entries[0] ?? [];
    if (!key || !roles?.length) return null;
    return roles.join(", ");
  }, [roleNamesByKey]);

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
          <div className="sm:col-span-2">
            <dt className="text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">Zugriffe</dt>
            <dd className="mt-0.5">
              {counts.granted} freigegeben · {counts.total - counts.granted} nicht freigegeben
            </dd>
          </div>
        </dl>
      )}

      {!interactive ? (
        <p className="rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2 text-xs text-[var(--muted)]">
          Die gewählte Funktion gibt die empfohlenen Zugriffe vor. Einzelne Berechtigungen pro Person
          (Freigabe entziehen trotz Rolle) erfordern eine Backend-Erweiterung — hier siehst du den
          effektiven Rollen-Stand. Passe bei Bedarf die Funktion in Schritt 2 an.
        </p>
      ) : null}

      <NavAlignedPermissionEditor
        moduleGroups={moduleGroups}
        selectedKeys={selectedKeys}
        onChange={() => {}}
        disabled={!interactive}
      />

      {provenanceSample ? (
        <p className="text-xs text-[var(--muted)]">
          Herkunft: Berechtigungen stammen aus den gewählten Funktionen
          {provenanceSample ? ` (z. B. „${provenanceSample}“)` : ""}.
        </p>
      ) : null}

      {navSummary.length > 0 ? (
        <details className="text-xs text-[var(--muted)]">
          <summary className="cursor-pointer font-medium text-[var(--foreground)]">Kurzüberblick nach Bereich</summary>
          <ul className="mt-2 space-y-1">
            {navSummary.map((section) => (
              <li key={section.label}>
                <span className="font-medium">{section.label}:</span>{" "}
                {section.items.length > 0
                  ? section.items.map((i) => `${i.label} (${i.access})`).join("; ")
                  : "Kein Zugriff"}
              </li>
            ))}
          </ul>
        </details>
      ) : null}
    </div>
  );
}
