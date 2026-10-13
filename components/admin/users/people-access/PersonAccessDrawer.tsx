"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Sheet } from "@/components/ui/Sheet";
import AdminAvatar from "@/components/admin/shared/AdminAvatar";
import AdminStatusPill from "@/components/admin/shared/AdminStatusPill";
import EffectiveAccessSummary from "@/components/admin/users/EffectiveAccessSummary";
import PeopleAccessPermissionPanel from "@/components/admin/users/people-access/PeopleAccessPermissionPanel";
import SceContextTabsBoundary from "@/components/sce/context-tabs/SceContextTabsBoundary";
import { SceContextTabPanel, useContextDetailTab } from "@/lib/context-tabs";
import type { PermissionMatrixModuleGroup } from "@/components/admin/roles/NavAlignedPermissionEditor";
import type { TenantUserItem } from "@/lib/users/queries";
import { groupRoleChipsForDisplay } from "@/lib/admin/people-access/role-display";
import type { EffectiveAccessModuleGroup } from "@/lib/roles/effective-access-summary";
import type { PermissionOverrideEffect } from "@/lib/permissions/apply-permission-overrides";
import {
  formatPeopleAccessDate,
  formatPeopleAccessDateTime,
} from "@/lib/admin/people-access/date-format";
import ImpersonateButton from "@/components/admin/users/ImpersonateButton";
import { canShowImpersonateTenantUserAction } from "@/lib/admin/users/tenant-impersonation-eligibility";
import {
  buildPersonDetailAdminHref,
  buildPersonDetailZugriffHref,
  buildPersonQuickViewTabNavigationConfig,
  type PersonQuickViewTabId,
} from "@/lib/admin/users/person-quick-view-config";

const QUICK_VIEW_TAB_PREFIX = "person-quick-view-tab";
const quickViewTabConfig = buildPersonQuickViewTabNavigationConfig();

type Props = {
  user: TenantUserItem | null;
  open: boolean;
  onClose: () => void;
  currentUserId: string;
  actorUserId?: string;
  canImpersonateTenant?: boolean;
  canManage: boolean;
  canInvite: boolean;
  privilegedRoleIds: string[];
  permissionModuleGroups?: PermissionMatrixModuleGroup[];
  onEditAccess: (userId: string) => void;
};

function getStatus(user: TenantUserItem) {
  const active = user.membershipIsActive && user.userIsActive;
  if (user.pendingInvitation) return { label: "Einladung ausstehend", tone: "warning" as const };
  if (active) return { label: "Aktiv", tone: "success" as const };
  return { label: "Deaktiviert", tone: "muted" as const };
}

function PersonQuickViewPanels({
  user,
  isSelf,
  status,
  roleChips,
  scopeLabels,
  canInvite,
  canManage,
  permissionModuleGroups,
  summaryGroups,
  permissionKeys,
  roleNamesByKey,
  overrideDraft,
  overrideSaving,
  onOverrideDraftChange,
  onResetOverrides,
}: {
  user: TenantUserItem;
  isSelf: boolean;
  status: ReturnType<typeof getStatus>;
  roleChips: ReturnType<typeof groupRoleChipsForDisplay>;
  scopeLabels: string[];
  canInvite: boolean;
  canManage: boolean;
  permissionModuleGroups: PermissionMatrixModuleGroup[];
  summaryGroups: EffectiveAccessModuleGroup[];
  permissionKeys: string[];
  roleNamesByKey: Record<string, readonly string[]>;
  overrideDraft: Record<string, PermissionOverrideEffect>;
  overrideSaving: boolean;
  onOverrideDraftChange: (next: Record<string, PermissionOverrideEffect>) => void;
  onResetOverrides: () => void;
}) {
  const { activeTab } = useContextDetailTab<PersonQuickViewTabId>();

  return (
    <div data-testid="person-quick-view-panels">
      <SceContextTabPanel
        tabKey="uebersicht"
        activeTab={activeTab}
        idPrefix={QUICK_VIEW_TAB_PREFIX}
        testId="person-quick-view-panel-uebersicht"
      >
        <div className="space-y-4">
          <p className="text-xs text-[var(--muted)]">
            Schnellüberblick — für vollständige Verwaltung die Detailseite öffnen.
          </p>
          <div className="flex items-center gap-3">
            <AdminAvatar name={user.name} size="md" />
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <p className="font-semibold">{user.name}</p>
                {isSelf ? (
                  <span className="rounded-full border border-amber-500/40 bg-amber-950/30 px-2 text-[0.65rem] font-semibold text-amber-200">
                    Ich
                  </span>
                ) : null}
                {user.isPlatformSystemIdentity ? (
                  <span className="rounded-full border border-slate-500/30 bg-slate-900/40 px-2 text-[0.65rem] font-semibold text-slate-200">
                    Systemzugang
                  </span>
                ) : null}
              </div>
              <p className="text-sm text-[var(--muted)]">{user.email}</p>
            </div>
          </div>
          <AdminStatusPill label={status.label} tone={status.tone} />
          <dl className="space-y-2 text-sm text-[var(--text-2)]">
            <div>
              <dt className="text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">
                Kontoaktivität
              </dt>
              <dd>
                Letzter Login:{" "}
                {user.lastLoginAt
                  ? formatPeopleAccessDateTime(user.lastLoginAt)
                  : "Kein Login registriert"}
              </dd>
            </div>
            {user.joinedAt ? (
              <div>
                <dt className="text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">
                  Mitgliedschaft
                </dt>
                <dd>Beitritt: {formatPeopleAccessDate(user.joinedAt)}</dd>
              </div>
            ) : null}
          </dl>
          {canInvite && user.pendingInvitation ? (
            <p className="text-sm text-amber-200/90">
              Einladung ausstehend — erneut senden oder widerrufen über das Aktionsmenü in der
              Liste.
            </p>
          ) : null}
        </div>
      </SceContextTabPanel>

      <SceContextTabPanel
        tabKey="rollen"
        activeTab={activeTab}
        idPrefix={QUICK_VIEW_TAB_PREFIX}
        testId="person-quick-view-panel-rollen"
      >
        <ul className="space-y-3">
          {roleChips.map((chip) => (
            <li key={chip.id} className="rounded-[var(--radius-lg)] border border-[var(--border)] p-3">
              <p className="font-medium">{chip.name}</p>
              <p className="text-xs text-[var(--muted)]">Clubweite Rolle</p>
              {chip.assignmentCount > 1 ? (
                <p className="mt-1 text-xs text-amber-200/90">
                  {chip.assignmentCount} separate Rollenzuweisungen (Legacy-Daten)
                </p>
              ) : null}
            </li>
          ))}
          {scopeLabels.map((label, i) => (
            <li key={i} className="rounded-[var(--radius-lg)] border border-[var(--border)] p-3">
              <p className="font-medium">{label}</p>
              <p className="text-xs text-[var(--muted)]">Bereichsbezogene Zuständigkeit</p>
            </li>
          ))}
          {roleChips.length === 0 && scopeLabels.length === 0 ? (
            <p className="text-sm text-[var(--muted)]">Keine Rollen oder Zuständigkeiten zugewiesen.</p>
          ) : null}
        </ul>
      </SceContextTabPanel>

      <SceContextTabPanel
        tabKey="zugriff"
        activeTab={activeTab}
        idPrefix={QUICK_VIEW_TAB_PREFIX}
        testId="person-quick-view-panel-zugriff"
      >
        <div className="space-y-4">
          <p className="text-sm text-[var(--text-2)]">
            Kurzüberblick über effektiven Zugriff. Umfassende Prüfung und Anpassungen erfolgen in
            der Personen-Detailseite unter «Zugriff».
          </p>
          {permissionModuleGroups.length > 0 ? (
            <>
              <PeopleAccessPermissionPanel
                moduleGroups={permissionModuleGroups}
                permissionKeys={permissionKeys}
                roleNamesByKey={roleNamesByKey}
                primaryRoleLabel={roleChips.map((c) => c.name).join(", ") || undefined}
                scopeLabel={
                  scopeLabels.length > 0
                    ? scopeLabels.join(" · ")
                    : roleChips.length > 0
                      ? "Gesamter Verein"
                      : undefined
                }
                interactive={canManage && !user.isPlatformSystemIdentity}
                overrideDraft={overrideDraft}
                onOverrideDraftChange={onOverrideDraftChange}
                onResetToRoleBaseline={onResetOverrides}
              />
              {overrideSaving ? (
                <p className="text-xs text-[var(--muted)]">Anpassungen werden gespeichert…</p>
              ) : null}
            </>
          ) : (
            <EffectiveAccessSummary groups={summaryGroups} />
          )}
          <ul className="space-y-2 text-sm text-[var(--text-2)]">
            {user.roles.map((r) => (
              <li key={r.id}>
                {r.name} → Gesamter Verein
              </li>
            ))}
            {user.scopedRoles?.map((s, i) => (
              <li key={`${s.id}-${i}`}>
                {s.name} → {s.orgUnitName}
              </li>
            ))}
          </ul>
        </div>
      </SceContextTabPanel>
    </div>
  );
}

export default function PersonAccessDrawer({
  user,
  open,
  onClose,
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
    if (!open || !user) return;

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
  }, [open, user]);

  const persistOverrides = useCallback(
    async (next: Record<string, PermissionOverrideEffect>) => {
      if (!user || !canManage) return;
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
    [user, canManage],
  );

  if (!user) return null;

  const status = getStatus(user);
  const isSelf = user.userId === currentUserId;
  const canImpersonateTarget = canShowImpersonateTenantUserAction({
    actorCanImpersonate: canImpersonateTenant,
    actorUserId,
    targetUserId: user.userId,
    pendingInvitation: user.pendingInvitation,
    membershipIsActive: user.membershipIsActive,
    userIsActive: user.userIsActive,
    isPlatformSystemIdentity: user.isPlatformSystemIdentity,
  });
  const roleChips = groupRoleChipsForDisplay(user.roles);
  const scopeLabels =
    user.scopedRoles?.map((s) => `${s.name} · ${s.orgUnitName}`) ?? [];

  const detailHref = buildPersonDetailAdminHref(user.userId);
  const zugriffHref = buildPersonDetailZugriffHref(user.userId);

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={user.name}
      description={user.email}
      footer={
        canImpersonateTarget || (canManage && !user.isPlatformSystemIdentity) ? (
          <div className="flex flex-wrap gap-2">
            {canImpersonateTarget ? (
              <ImpersonateButton userId={user.userId} variant="person-detail" />
            ) : null}
            {canManage && !user.isPlatformSystemIdentity ? (
              <>
                <Link
                  href={zugriffHref}
                  className={
                    canImpersonateTarget ? "fca-button-secondary text-sm" : "fca-button-primary text-sm"
                  }
                  data-testid="person-quick-view-edit-access"
                  onClick={() => {
                    onClose();
                    onEditAccess(user.userId);
                  }}
                >
                  Zugriff bearbeiten
                </Link>
                <Link
                  href={detailHref}
                  className="fca-button-secondary text-sm"
                  data-testid="person-quick-view-detail"
                  title="Umfassende Personenverwaltung: Rollen, Bereiche, Veranstaltungs-Freigaben und Zugriff"
                >
                  Detailseite
                </Link>
              </>
            ) : null}
          </div>
        ) : user.isPlatformSystemIdentity ? (
          <p className="text-xs text-[var(--muted)]">Systemzugang — keine tenant-seitigen Änderungen.</p>
        ) : null
      }
    >
      <SceContextTabsBoundary
        config={quickViewTabConfig}
        tabStateMode="local"
        ariaLabel="Person Schnellansicht"
        testId="person-quick-view-nav"
        idPrefix={QUICK_VIEW_TAB_PREFIX}
      >
        <PersonQuickViewPanels
          user={user}
          isSelf={isSelf}
          status={status}
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
    </Sheet>
  );
}
