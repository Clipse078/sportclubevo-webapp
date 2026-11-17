"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import AdminStatusPill from "@/components/admin/shared/AdminStatusPill";
import ImpersonateButton from "@/components/admin/users/ImpersonateButton";
import { PersonAccessQuickViewBody } from "@/components/admin/users/people-access/PersonAccessDrawer";
import SceContextTabsBoundary from "@/components/sce/context-tabs/SceContextTabsBoundary";
import SceClubDevelopmentSectionShell from "@/components/admin/club-development/SceClubDevelopmentSectionShell";
import type { PermissionMatrixModuleGroup } from "@/components/admin/roles/NavAlignedPermissionEditor";
import { resolvePeopleAccessAccountStatus } from "@/lib/admin/people-access/people-access-account-status";
import { groupRoleChipsForDisplay } from "@/lib/admin/people-access/role-display";
import { buildVereinsentwicklungAccessRows } from "@/lib/admin/people-access/vereinsentwicklung-access-presentation";
import {
  buildPersonDetailAdminHref,
  buildPersonDetailZugriffHref,
  buildPersonQuickViewTabNavigationConfig,
} from "@/lib/admin/users/person-quick-view-config";
import { canShowImpersonateTenantUserAction } from "@/lib/admin/users/tenant-impersonation-eligibility";
import type { PermissionOverrideEffect } from "@/lib/permissions/apply-permission-overrides";
import type { EffectiveAccessModuleGroup } from "@/lib/roles/effective-access-summary";
import type { TenantUserItem } from "@/lib/users/queries";

const QUICK_VIEW_TAB_PREFIX = "person-quick-view-tab";
const quickViewTabConfig = buildPersonQuickViewTabNavigationConfig();

type Props = {
  user: TenantUserItem;
  currentUserId: string;
  actorUserId?: string;
  canImpersonateTenant?: boolean;
  canManage: boolean;
  canInvite: boolean;
  permissionModuleGroups?: PermissionMatrixModuleGroup[];
  onEditAccess: (userId: string) => void;
};

export default function PersonAccessInlineOverview({
  user,
  currentUserId,
  actorUserId = currentUserId,
  canImpersonateTenant = false,
  canManage,
  canInvite,
  permissionModuleGroups = [],
  onEditAccess,
}: Props) {
  const [summaryGroups, setSummaryGroups] = useState<EffectiveAccessModuleGroup[]>([]);
  const [permissionKeys, setPermissionKeys] = useState<string[]>([]);
  const [roleNamesByKey, setRoleNamesByKey] = useState<Record<string, readonly string[]>>({});
  const [overrideDraft, setOverrideDraft] = useState<Record<string, PermissionOverrideEffect>>({});
  const [overrideSaving, setOverrideSaving] = useState(false);

  useEffect(() => {
    fetch("/api/tenant/effective-access/preview", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ roleIds: user.roles.map((r) => r.id) }),
    })
      .then((r) => r.json())
      .then((data) => {
        setSummaryGroups(data.summary ?? []);
        setPermissionKeys(
          Array.isArray(data.permissionKeys)
            ? data.permissionKeys.filter((k: unknown) => typeof k === "string")
            : [],
        );
        setRoleNamesByKey(
          data.roleNamesByKey && typeof data.roleNamesByKey === "object" ? data.roleNamesByKey : {},
        );
      })
      .catch(() => {
        setSummaryGroups([]);
        setPermissionKeys([]);
        setRoleNamesByKey({});
      });

    fetch(`/api/admin/users/${encodeURIComponent(user.userId)}/permission-overrides`)
      .then((r) => (r.ok ? r.json() : { overrides: [] }))
      .then((data) => {
        const record: Record<string, PermissionOverrideEffect> = {};
        if (Array.isArray(data.overrides)) {
          for (const row of data.overrides) {
            if (
              row &&
              typeof row.permissionKey === "string" &&
              (row.effect === "ALLOW" || row.effect === "DENY")
            ) {
              record[row.permissionKey] = row.effect;
            }
          }
        }
        setOverrideDraft(record);
      })
      .catch(() => setOverrideDraft({}));
  }, [user]);

  const persistOverrides = useCallback(
    async (next: Record<string, PermissionOverrideEffect>) => {
      if (!canManage) return;
      setOverrideSaving(true);
      try {
        const res = await fetch(
          `/api/admin/users/${encodeURIComponent(user.userId)}/permission-overrides`,
          {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              overrides: Object.entries(next).map(([permissionKey, effect]) => ({
                permissionKey,
                effect,
              })),
            }),
          },
        );
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          window.alert(data.error ?? "Speichern der Anpassungen fehlgeschlagen.");
          return;
        }
        setOverrideDraft(next);
      } finally {
        setOverrideSaving(false);
      }
    },
    [user.userId, canManage],
  );

  const accountStatus = resolvePeopleAccessAccountStatus(user);
  const isSelf = user.userId === currentUserId;
  const roleChips = groupRoleChipsForDisplay(user.roles);
  const scopeLabels = user.scopedRoles?.map((s) => `${s.name} · ${s.orgUnitName}`) ?? [];
  const vlRows = buildVereinsentwicklungAccessRows(new Set(permissionKeys));

  const canImpersonateTarget = canShowImpersonateTenantUserAction({
    actorCanImpersonate: canImpersonateTenant,
    actorUserId,
    targetUserId: user.userId,
    pendingInvitation: user.pendingInvitation,
    membershipIsActive: user.membershipIsActive,
    userIsActive: user.userIsActive,
    isPlatformSystemIdentity: user.isPlatformSystemIdentity,
  });

  return (
    <div
      className="border-b border-[var(--border)] bg-white px-4 py-4 md:px-5"
      data-testid={`people-access-inline-overview-${user.userId}`}
      data-sce-people-access-flow="inline-expand"
    >
      <SceClubDevelopmentSectionShell title="Profil & effektiver Zugriff">
        <p className="mb-3 text-xs text-[var(--muted)]">
          Person, Konto, Mitgliedschaft und Module — ohne Overlay.
        </p>
        <div className="mb-3 flex flex-wrap items-center gap-2 text-sm">
          <AdminStatusPill label={accountStatus.label} tone={accountStatus.tone} />
          {!accountStatus.loginActive ? (
            <span className="text-xs text-[var(--muted)]">Aktives Konto ≠ Modulzugriff</span>
          ) : null}
          {user.linkedPersonName ? (
            <span className="text-xs text-[var(--muted)]">Person: {user.linkedPersonName}</span>
          ) : null}
        </div>

        <div className="mb-4 rounded-lg border border-[var(--border)]/80 bg-[var(--surface-2)]/40 p-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">
            Vereinsentwicklung & Sitzungen
          </p>
          <ul className="mt-2 space-y-1.5 text-sm">
            {vlRows.map((row) => (
              <li key={row.navLabel} className="flex justify-between gap-3">
                <span>{row.navLabel}</span>
                <span className="text-[var(--muted)]">
                  {row.state === "deny"
                    ? "Kein Zugriff"
                    : row.detail}
                </span>
              </li>
            ))}
          </ul>
        </div>

        <SceContextTabsBoundary
          config={quickViewTabConfig}
          tabStateMode="local"
          ariaLabel="Person Schnellansicht"
          testId="person-quick-view-nav"
          idPrefix={QUICK_VIEW_TAB_PREFIX}
        >
          <PersonAccessQuickViewBody
            user={user}
            isSelf={isSelf}
            status={{
              label: accountStatus.label,
              tone: accountStatus.tone,
            }}
            roleChips={roleChips}
            scopeLabels={scopeLabels}
            canInvite={canInvite}
            canManage={canManage}
            permissionModuleGroups={permissionModuleGroups}
            summaryGroups={summaryGroups}
            permissionKeys={permissionKeys}
            roleNamesByKey={roleNamesByKey}
            overrideDraft={overrideDraft}
            overrideSaving={overrideSaving}
            onOverrideDraftChange={(next) => {
              setOverrideDraft(next);
              void persistOverrides(next);
            }}
            onResetOverrides={() => void persistOverrides({})}
          />
        </SceContextTabsBoundary>

        <nav
          className="mt-4 flex flex-wrap gap-2 border-t border-[var(--border)]/60 pt-3"
          aria-label="Person Aktionen"
        >
          {canImpersonateTarget ? (
            <ImpersonateButton userId={user.userId} variant="person-detail" />
          ) : null}
          {canManage && !user.isPlatformSystemIdentity ? (
            <>
              <Link
                href={buildPersonDetailZugriffHref(user.userId)}
                className="fca-button-primary text-sm"
                data-testid="person-inline-edit-access"
                onClick={() => onEditAccess(user.userId)}
              >
                Zugriff bearbeiten
              </Link>
              <Link
                href={buildPersonDetailAdminHref(user.userId)}
                className="fca-button-secondary text-sm"
                data-testid="person-inline-detail"
              >
                Detailseite
              </Link>
            </>
          ) : null}
        </nav>
      </SceClubDevelopmentSectionShell>
    </div>
  );
}