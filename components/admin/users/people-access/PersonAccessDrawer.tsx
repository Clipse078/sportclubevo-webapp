"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Sheet } from "@/components/ui/Sheet";
import AdminAvatar from "@/components/admin/shared/AdminAvatar";
import AdminStatusPill from "@/components/admin/shared/AdminStatusPill";
import EffectiveAccessSummary from "@/components/admin/users/EffectiveAccessSummary";
import PeopleAccessPermissionPanel from "@/components/admin/users/people-access/PeopleAccessPermissionPanel";
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
import { canShowImpersonateTenantUserAction } from "@/lib/admin/users/tenant-impersonation";

type Tab = "overview" | "functions" | "access" | "activity";

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
  const [tab, setTab] = useState<Tab>("overview");
  const [summaryGroups, setSummaryGroups] = useState<EffectiveAccessModuleGroup[]>([]);
  const [permissionKeys, setPermissionKeys] = useState<string[]>([]);
  const [roleNamesByKey, setRoleNamesByKey] = useState<Record<string, readonly string[]>>({});
  const [overrideDraft, setOverrideDraft] = useState<Record<string, PermissionOverrideEffect>>({});
  const [overrideSaving, setOverrideSaving] = useState(false);
  const [accessView, setAccessView] = useState<{
    assignedRoles: Array<{ name: string; key: string }>;
    platformRoles: Array<{ name: string; key: string }>;
    effectiveTenantPermissionKeys: string[];
  } | null>(null);

  useEffect(() => {
    if (!open || !user) return;
    fetch(`/api/tenant/effective-access?userId=${encodeURIComponent(user.userId)}`)
      .then((r) => r.json())
      .then((data) => {
        setAccessView(data.view ?? null);
      })
      .catch(() => setAccessView(null));

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

  const tabs: { id: Tab; label: string }[] = [
    { id: "overview", label: "Übersicht" },
    { id: "functions", label: "Funktionen" },
    { id: "access", label: "Zugriff" },
    { id: "activity", label: "Aktivität" },
  ];

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
                <button
                  type="button"
                  className={
                    canImpersonateTarget ? "fca-button-secondary text-sm" : "fca-button-primary text-sm"
                  }
                  onClick={() => onEditAccess(user.userId)}
                >
                  Zugriff bearbeiten
                </button>
                <Link
                  href={`/dashboard/admin/users/${user.userId}`}
                  className="fca-button-secondary text-sm"
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
      <div className="mb-4 flex flex-wrap gap-2">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={`rounded-full px-3 py-1 text-xs font-medium ${
              tab === t.id
                ? "bg-[var(--blue,#2563EB)] text-white"
                : "bg-[var(--surface-2)] text-[var(--muted)]"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "overview" ? (
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <AdminAvatar name={user.name} size="md" />
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <p className="font-semibold">{user.name}</p>
                {isSelf ? (
                  <span className="rounded-full border border-amber-200 bg-amber-50 px-2 text-[0.65rem] font-semibold text-amber-700">
                    Ich
                  </span>
                ) : null}
                {user.isPlatformSystemIdentity ? (
                  <span className="rounded-full border border-slate-200 bg-slate-50 px-2 text-[0.65rem] font-semibold text-slate-700">
                    Systemzugang
                  </span>
                ) : null}
              </div>
              <p className="text-sm text-[var(--muted)]">{user.email}</p>
            </div>
          </div>
          <AdminStatusPill label={status.label} tone={status.tone} />
          <p className="text-sm text-[var(--muted)]">
            Letzte Aktivität:{" "}
            {formatPeopleAccessDate(user.lastLoginAt)}
          </p>
          {canInvite && user.pendingInvitation ? (
            <p className="text-sm text-amber-700">Einladung ausstehend — erneut senden oder widerrufen über das Aktionsmenü.</p>
          ) : null}
        </div>
      ) : null}

      {tab === "functions" ? (
        <ul className="space-y-3">
          {roleChips.map((chip) => (
            <li key={chip.id} className="rounded-[var(--radius-lg)] border border-[var(--border)] p-3">
              <p className="font-medium">{chip.name}</p>
              <p className="text-xs text-[var(--muted)]">Gesamter Verein</p>
              {chip.assignmentCount > 1 ? (
                <p className="mt-1 text-xs text-amber-700">
                  {chip.assignmentCount} separate Rollenzuweisungen (Legacy-Daten)
                </p>
              ) : null}
            </li>
          ))}
          {scopeLabels.map((label, i) => (
            <li key={i} className="rounded-[var(--radius-lg)] border border-[var(--border)] p-3">
              <p className="font-medium">{label}</p>
            </li>
          ))}
          {roleChips.length === 0 && scopeLabels.length === 0 ? (
            <p className="text-sm text-[var(--muted)]">Keine Funktion zugewiesen.</p>
          ) : null}
        </ul>
      ) : null}

      {tab === "access" ? (
        <div className="space-y-6">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">
              Rollenbasierter Zugriff
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
                  className="mt-2"
                  interactive={canManage && !user.isPlatformSystemIdentity}
                  overrideDraft={overrideDraft}
                  onOverrideDraftChange={(next) => {
                    setOverrideDraft(next);
                    void persistOverrides(next);
                  }}
                  onResetToRoleBaseline={() => void persistOverrides({})}
                />
                {overrideSaving ? (
                  <p className="mt-2 text-xs text-[var(--muted)]">Anpassungen werden gespeichert…</p>
                ) : null}
              </>
            ) : (
              <EffectiveAccessSummary groups={summaryGroups} />
            )}
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">
              Warum hat diese Person Zugriff?
            </p>
            <ul className="mt-2 space-y-2 text-sm">
              {user.roles.map((r) => (
                <li key={r.id}>
                  {r.name} → Gesamter Verein → Modulzugriff über Rolle
                </li>
              ))}
              {user.scopedRoles?.map((s, i) => (
                <li key={`${s.id}-${i}`}>
                  {s.name} → {s.orgUnitName} → Bereichsbezogener Zugriff
                </li>
              ))}
            </ul>
            {accessView?.effectiveTenantPermissionKeys?.length ? (
              <details className="mt-4">
                <summary className="cursor-pointer text-xs text-[var(--muted)]">Technische Berechtigungsschlüssel</summary>
                <ul className="mt-2 max-h-40 overflow-y-auto font-mono text-[0.65rem] text-[var(--muted)]">
                  {accessView.effectiveTenantPermissionKeys.slice(0, 40).map((k) => (
                    <li key={k}>{k}</li>
                  ))}
                </ul>
              </details>
            ) : null}
          </div>
        </div>
      ) : null}

      {tab === "activity" ? (
        <ul className="space-y-2 text-sm text-[var(--muted)]">
          {user.lastLoginAt ? (
            <li>Letzter Login: {formatPeopleAccessDateTime(user.lastLoginAt)}</li>
          ) : (
            <li>Kein Login registriert.</li>
          )}
          {user.pendingInvitation ? <li>Einladung ausstehend</li> : null}
          {user.joinedAt ? (
            <li>Beitritt: {formatPeopleAccessDate(user.joinedAt)}</li>
          ) : null}
          <li className="text-xs">Weitere Audit-Ereignisse folgen in einer späteren Governance-Erweiterung.</li>
        </ul>
      ) : null}
    </Sheet>
  );
}
