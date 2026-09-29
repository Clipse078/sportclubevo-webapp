"use client";

import { useCallback, useMemo, useState } from "react";
import NavAlignedPermissionEditor, {
  type PermissionMatrixModuleGroup,
} from "@/components/admin/roles/NavAlignedPermissionEditor";
import {
  buildNavPermissionPresentationFromModuleGroups,
  buildNavPermissionSummary,
} from "@/lib/roles/nav-permission-presentation";
import { collectAllGrantableKeys } from "@/lib/roles/permission-section-presentation";
import {
  applyPermissionOverrides,
  reconcileOverridesFromEffectiveChange,
  type PermissionOverrideEffect,
} from "@/lib/permissions/apply-permission-overrides";

export type PeopleAccessPermissionPanelProps = {
  moduleGroups: PermissionMatrixModuleGroup[];
  permissionKeys: readonly string[];
  roleNamesByKey: Readonly<Record<string, readonly string[]>>;
  interactive?: boolean;
  primaryRoleLabel?: string;
  scopeLabel?: string;
  className?: string;
  /** Controlled override draft (wizard / drawer). */
  overrideDraft?: Readonly<Record<string, PermissionOverrideEffect>>;
  onOverrideDraftChange?: (next: Record<string, PermissionOverrideEffect>) => void;
  onResetToRoleBaseline?: () => void;
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
  overrideDraft = {},
  onOverrideDraftChange,
  onResetToRoleBaseline,
}: PeopleAccessPermissionPanelProps) {
  const roleBaselineKeys = useMemo(() => new Set(permissionKeys), [permissionKeys]);
  const effectiveKeys = useMemo(
    () =>
      applyPermissionOverrides(
        roleBaselineKeys,
        Object.entries(overrideDraft).map(([permissionKey, effect]) => ({
          permissionKey,
          effect,
        })),
      ),
    [roleBaselineKeys, overrideDraft],
  );

  const presentation = useMemo(
    () => buildNavPermissionPresentationFromModuleGroups(moduleGroups),
    [moduleGroups],
  );
  const counts = useMemo(
    () => countGrantStates(moduleGroups, effectiveKeys),
    [moduleGroups, effectiveKeys],
  );
  const navSummary = useMemo(
    () => buildNavPermissionSummary(presentation, effectiveKeys),
    [presentation, effectiveKeys],
  );

  const overrideCount = Object.keys(overrideDraft).length;

  const handleEffectiveChange = useCallback(
    (nextEffective: Set<string>) => {
      if (!onOverrideDraftChange) return;
      onOverrideDraftChange(reconcileOverridesFromEffectiveChange(roleBaselineKeys, nextEffective));
    },
    [onOverrideDraftChange, roleBaselineKeys],
  );

  const confirmPrivilegedEnable = useCallback((label: string) => {
    if (typeof window === "undefined") return true;
    return window.confirm(
      `⚠ Privilegierter Zugriff\n\n"${label}" gewähren?\n\nDiese Berechtigung kann sensible Verwaltungsfunktionen freischalten.`,
    );
  }, []);

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
            <dt className="text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">
              Rollen-Zugriff
            </dt>
            <dd className="mt-0.5">{counts.granted} Berechtigungen</dd>
          </div>
          <div>
            <dt className="text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">
              Individuelle Anpassungen
            </dt>
            <dd className="mt-0.5">{overrideCount}</dd>
          </div>
        </dl>
      )}

      {interactive ? (
        <p className="text-xs text-[var(--muted)]">
          Funktion gibt den Standard vor. Nur Abweichungen werden individuell angepasst.
        </p>
      ) : (
        <p className="rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2 text-xs text-[var(--muted)]">
          Die gewählte Funktion definiert den empfohlenen Zugriff. Individuelle Freigaben oder Entzüge
          können autorisierte Club Admins über die Schalter unten vornehmen.
        </p>
      )}

      {interactive && overrideCount > 0 && onResetToRoleBaseline ? (
        <button
          type="button"
          onClick={() => {
            if (
              window.confirm(
                "Alle individuellen Anpassungen für diese Person entfernen und auf den Rollenstandard zurücksetzen?",
              )
            ) {
              onResetToRoleBaseline();
            }
          }}
          className="text-xs font-medium text-[var(--blue,#2563EB)] underline-offset-2 hover:underline"
        >
          Auf Rollenstandard zurücksetzen
        </button>
      ) : null}

      <NavAlignedPermissionEditor
        moduleGroups={moduleGroups}
        selectedKeys={effectiveKeys}
        onChange={handleEffectiveChange}
        disabled={!interactive}
        peopleAccessMode
        sectionsInitiallyExpanded={false}
        roleBaselineKeys={roleBaselineKeys}
        overrideByKey={overrideDraft}
        roleNamesByKey={roleNamesByKey}
        onConfirmPrivilegedEnable={confirmPrivilegedEnable}
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
    </div>
  );
}

export function summarizeOverrideDraftForReview(
  overrideDraft: Readonly<Record<string, PermissionOverrideEffect>>,
  permissionNameByKey: Readonly<Record<string, string>>,
): { added: string[]; removed: string[] } {
  const added: string[] = [];
  const removed: string[] = [];
  for (const [key, effect] of Object.entries(overrideDraft)) {
    const label = permissionNameByKey[key] ?? key;
    if (effect === "ALLOW") added.push(label);
    else removed.push(label);
  }
  added.sort((a, b) => a.localeCompare(b, "de"));
  removed.sort((a, b) => a.localeCompare(b, "de"));
  return { added, removed };
}
