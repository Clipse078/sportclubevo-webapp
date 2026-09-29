"use client";
import { ProductDomainSceIcon } from "@/components/icons/ProductDomainSceIcon";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { Search, UserPlus, UserX } from "lucide-react";
import AdminAvatar from "@/components/admin/shared/AdminAvatar";
import AdminStatusPill from "@/components/admin/shared/AdminStatusPill";
import { EmptyState } from "@/components/ui/page/EmptyState";
import UserRowActionsMenu from "@/components/admin/users/UserRowActionsMenu";
import PeopleAccessWizardDialog from "@/components/admin/users/people-access/PeopleAccessWizardDialog";
import PersonAccessDrawer from "@/components/admin/users/people-access/PersonAccessDrawer";
import type { WizardRoleOption } from "@/components/admin/users/people-access/PeopleAccessWizard";
import type { PermissionMatrixModuleGroup } from "@/components/admin/roles/NavAlignedPermissionEditor";
import { groupRoleChipsForDisplay } from "@/lib/admin/people-access/role-display";
import { userHasPrivilegedRole } from "@/lib/admin/people-access/privileged-utils";
import type { TenantUserItem, TenantPersonWithoutUser } from "@/lib/users/queries";

export type PeopleAccessWizardConfig = {
  availableRoles: WizardRoleOption[];
  availableOrgUnits: { id: string; name: string }[];
  permissionModuleGroups: PermissionMatrixModuleGroup[];
  clubAdminRoleKey: string;
  privilegedRoleIds: string[];
};

type Props = {
  initialUsers: TenantUserItem[];
  personsWithoutUser: TenantPersonWithoutUser[];
  currentUserId: string;
  canInvite: boolean;
  canManage?: boolean;
  canGlobalDelete?: boolean;
  wizardConfig?: PeopleAccessWizardConfig;
};

function getRoleBadgeClass(roleKey: string): string {
  const k = roleKey.toLowerCase();
  if (k.includes("superadmin") || k.includes("super_admin")) return "sce-role-badge sce-role-badge-admin";
  if (k.includes("admin")) return "sce-role-badge sce-role-badge-admin";
  if (k.includes("trainer")) return "sce-role-badge sce-role-badge-trainer";
  if (k.includes("staff")) return "sce-role-badge sce-role-badge-staff";
  return "sce-role-badge sce-role-badge-member";
}

type StatusFilter = "all" | "active" | "deactivated" | "pending" | "not_invited" | "privileged";

function getAccessStatusLabel(
  user: TenantUserItem,
): { label: string; tone: "success" | "warning" | "muted" } {
  const isEffectivelyActive = user.membershipIsActive && user.userIsActive;
  if (user.pendingInvitation) {
    return { label: "Einladung ausstehend", tone: "warning" };
  }
  if (isEffectivelyActive) {
    return { label: "Aktiv", tone: "success" };
  }
  return { label: "Deaktiviert", tone: "muted" };
}

function formatLastActivity(date: Date | string | null): string {
  if (!date) return "—";
  const d = typeof date === "string" ? new Date(date) : date;
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("de-CH", { day: "2-digit", month: "short", year: "numeric" });
}

function formatScopeSummary(user: TenantUserItem): string {
  const parts: string[] = [];
  if (user.roles.length > 0) parts.push("Gesamter Verein");
  const scoped = user.scopedRoles?.map((s) => s.orgUnitName).filter(Boolean) ?? [];
  for (const s of scoped) {
    if (!parts.includes(s)) parts.push(s);
  }
  if (parts.length === 0) return "Kein Bereich zugewiesen";
  return parts.join(" · ");
}

function formatAccessSummary(user: TenantUserItem): string {
  const fnCount = groupRoleChipsForDisplay(user.roles).length + (user.scopedRoles?.length ?? 0);
  if (fnCount === 0) return "Kein Zugriff";
  if (user.isPlatformSystemIdentity) return "System · Plattform";
  return `${fnCount} Funktion${fnCount === 1 ? "" : "en"}`;
}

export default function TenantUsersSearchableList({
  initialUsers,
  personsWithoutUser,
  currentUserId,
  canInvite,
  canManage = false,
  canGlobalDelete = false,
  wizardConfig,
}: Props) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [scopeQuery, setScopeQuery] = useState("");
  const [wizardOpen, setWizardOpen] = useState(false);
  const [wizardPersonId, setWizardPersonId] = useState("");
  const [wizardEmail, setWizardEmail] = useState("");
  const [drawerUser, setDrawerUser] = useState<TenantUserItem | null>(null);

  const privilegedRoleIds = useMemo(
    () => wizardConfig?.privilegedRoleIds ?? [],
    [wizardConfig?.privilegedRoleIds],
  );

  const uniqueRoles = useMemo(() => {
    const seen = new Map<string, string>();
    for (const u of initialUsers) {
      for (const r of u.roles) {
        if (!seen.has(r.id)) seen.set(r.id, r.name);
      }
      for (const s of u.scopedRoles ?? []) {
        if (!seen.has(s.id)) seen.set(s.id, s.name);
      }
    }
    return Array.from(seen.entries())
      .map(([id, name]) => ({ id, name }))
      .sort((a, b) => a.name.localeCompare(b.name, "de"));
  }, [initialUsers]);

  const filteredUsers = useMemo(() => {
    const q = query.trim().toLowerCase();
    const scopeQ = scopeQuery.trim().toLowerCase();
    return initialUsers.filter((u) => {
      const isEffectivelyActive = u.membershipIsActive && u.userIsActive;
      const allRoleIds = [...u.roles.map((r) => r.id), ...(u.scopedRoles?.map((s) => s.id) ?? [])];
      const isPrivileged = userHasPrivilegedRole(allRoleIds, privilegedRoleIds);

      if (statusFilter === "active" && !isEffectivelyActive) return false;
      if (statusFilter === "deactivated" && (isEffectivelyActive || u.pendingInvitation)) return false;
      if (statusFilter === "pending" && !u.pendingInvitation) return false;
      if (statusFilter === "not_invited") return false;
      if (statusFilter === "privileged" && !isPrivileged) return false;

      if (roleFilter !== "all") {
        const hasRole =
          u.roles.some((r) => r.id === roleFilter) ||
          u.scopedRoles?.some((s) => s.id === roleFilter);
        if (!hasRole) return false;
      }

      if (scopeQ) {
        const scopeText = formatScopeSummary(u).toLowerCase();
        if (!scopeText.includes(scopeQ)) return false;
      }

      if (q) {
        const matches =
          u.name.toLowerCase().includes(q) ||
          u.email.toLowerCase().includes(q) ||
          u.roles.some((r) => r.name.toLowerCase().includes(q)) ||
          (u.scopedRoles?.some((s) => s.name.toLowerCase().includes(q) || s.orgUnitName.toLowerCase().includes(q)) ??
            false);
        if (!matches) return false;
      }
      return true;
    });
  }, [initialUsers, query, statusFilter, roleFilter, scopeQuery, privilegedRoleIds]);

  const filteredPersons = useMemo(() => {
    if (statusFilter !== "all" && statusFilter !== "not_invited") return [];
    const q = query.trim().toLowerCase();
    return personsWithoutUser.filter((p) => {
      if (q) {
        const matches =
          p.name.toLowerCase().includes(q) ||
          (p.email ?? "").toLowerCase().includes(q);
        if (!matches) return false;
      }
      return true;
    });
  }, [personsWithoutUser, query, statusFilter]);

  const activeCount = initialUsers.filter((u) => u.membershipIsActive && u.userIsActive).length;
  const pendingCount = initialUsers.filter((u) => u.pendingInvitation).length;
  const inactiveCount = initialUsers.filter(
    (u) => !(u.membershipIsActive && u.userIsActive) && !u.pendingInvitation,
  ).length;
  const noAccountCount = personsWithoutUser.length;
  const privilegedCount = initialUsers.filter((u) =>
    userHasPrivilegedRole(
      [...u.roles.map((r) => r.id), ...(u.scopedRoles?.map((s) => s.id) ?? [])],
      privilegedRoleIds,
    ),
  ).length;

  const isFiltered =
    query.trim() !== "" ||
    statusFilter !== "all" ||
    roleFilter !== "all" ||
    scopeQuery.trim() !== "";
  const totalShown = filteredUsers.length + filteredPersons.length;
  const grandTotal = initialUsers.length + personsWithoutUser.length;

  const gridCols =
    "md:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)_minmax(0,0.9fr)_80px_100px_100px_40px]";

  function openWizardForPerson(personId?: string, email?: string) {
    setWizardPersonId(personId ?? "");
    setWizardEmail(email ?? "");
    setWizardOpen(true);
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {(
          [
            { key: "active" as const, label: "Aktiv", value: activeCount, sub: "aktive Zugänge", color: "text-emerald-600" },
            { key: "pending" as const, label: "Einladungen", value: pendingCount, sub: "ausstehend", color: "text-amber-500" },
            { key: "deactivated" as const, label: "Deaktiviert", value: inactiveCount, sub: "ohne Zugriff", color: "text-[var(--muted)]" },
            { key: "not_invited" as const, label: "Nicht eingeladen", value: noAccountCount, sub: "Personen", color: "text-[var(--foreground)]" },
            ...(privilegedRoleIds.length > 0
              ? [{ key: "privileged" as const, label: "Privilegiert", value: privilegedCount, sub: "Admin-Zugänge", color: "text-amber-700" }]
              : []),
          ] as const
        ).map((kpi) => (
          <button
            key={kpi.key}
            type="button"
            onClick={() => setStatusFilter((prev) => (prev === kpi.key ? "all" : kpi.key))}
            className={`sce-kpi-card text-left transition ring-offset-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--blue)]/40 ${
              statusFilter === kpi.key ? "ring-2 ring-[var(--blue)]/30" : ""
            }`}
          >
            <p className="sce-data-label">{kpi.label}</p>
            <p className={`mt-1.5 text-2xl font-bold ${kpi.color}`} style={{ fontFamily: "var(--font-display)" }}>
              {kpi.value}
            </p>
            <p className="mt-1 text-xs text-[var(--muted)]">{kpi.sub}</p>
          </button>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="sce-page-search min-w-[200px] flex-1">
          <Search className="h-4 w-4 flex-shrink-0 text-[var(--muted)]" />
          <input
            type="text"
            placeholder="Name oder E-Mail suchen…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            autoComplete="off"
          />
          {query ? (
            <button type="button" onClick={() => setQuery("")} className="flex-shrink-0 text-xs font-medium text-[var(--muted)]">
              Löschen
            </button>
          ) : null}
        </div>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
          className="fca-input h-9 text-sm"
          aria-label="Status filtern"
        >
          <option value="all">Alle Status</option>
          <option value="active">Aktiv ({activeCount})</option>
          <option value="pending">Einladung ausstehend ({pendingCount})</option>
          <option value="deactivated">Deaktiviert ({inactiveCount})</option>
          <option value="not_invited">Nicht eingeladen ({noAccountCount})</option>
          {privilegedRoleIds.length > 0 ? (
            <option value="privileged">Privilegiert ({privilegedCount})</option>
          ) : null}
        </select>

        {uniqueRoles.length > 0 ? (
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="fca-input h-9 text-sm"
            aria-label="Funktion filtern"
          >
            <option value="all">Alle Funktionen</option>
            {uniqueRoles.map((r) => (
              <option key={r.id} value={r.id}>{r.name}</option>
            ))}
          </select>
        ) : null}

        <input
          type="search"
          placeholder="Bereich filtern…"
          value={scopeQuery}
          onChange={(e) => setScopeQuery(e.target.value)}
          className="fca-input h-9 min-w-[140px] text-sm"
          aria-label="Bereich filtern"
        />

        {canInvite && wizardConfig ? (
          <button
            type="button"
            onClick={() => openWizardForPerson()}
            className="inline-flex h-9 items-center gap-1.5 rounded-[var(--radius-md)] bg-[var(--blue,#2563EB)] px-3 text-sm font-medium text-white"
          >
            <UserPlus className="h-4 w-4" />
            Person hinzufügen
          </button>
        ) : null}
      </div>

      {isFiltered ? (
        <p className="text-sm text-[var(--muted)]">{totalShown} von {grandTotal} Einträgen</p>
      ) : null}

      {grandTotal === 0 ? (
        <EmptyState
          icon={<ProductDomainSceIcon name="people" size={48} />}
          heading="Noch keine Personen mit Zugang"
          description="Füge die erste Person hinzu, um Zugang zu SportClubEvo zu vergeben."
        />
      ) : totalShown === 0 ? (
        <EmptyState
          icon={<UserX className="h-10 w-10" />}
          heading="Keine Personen gefunden."
          description="Für die gewählten Filter wurden keine Einträge gefunden."
          action={
            isFiltered ? (
              <button
                type="button"
                onClick={() => {
                  setQuery("");
                  setStatusFilter("all");
                  setRoleFilter("all");
                  setScopeQuery("");
                }}
                className="fca-button-secondary text-sm"
              >
                Filter zurücksetzen
              </button>
            ) : undefined
          }
        />
      ) : (
        <div className="overflow-hidden rounded-[var(--radius-2xl)] border border-[var(--border)] bg-[var(--surface)] shadow-[var(--shadow-sm)]">
          <div
            className={`hidden gap-3 border-b border-[var(--border)] bg-[var(--surface-2)] px-5 py-2.5 text-xs font-semibold uppercase tracking-[0.1em] text-[var(--muted)] md:grid ${gridCols}`}
          >
            <span>Person</span>
            <span>Funktion</span>
            <span>Bereich</span>
            <span>Zugriff</span>
            <span>Status</span>
            <span>Letzte Aktivität</span>
            <span />
          </div>

          {filteredUsers.map((user, idx) => {
            const isLast = idx === filteredUsers.length - 1 && filteredPersons.length === 0;
            const isCurrentUser = user.userId === currentUserId;
            const status = getAccessStatusLabel(user);
            const roleChips = groupRoleChipsForDisplay(user.roles);

            return (
              <div
                key={user.userId}
                className={`group relative flex flex-col gap-3 px-5 py-4 md:grid md:items-center md:gap-3 hover:bg-[var(--surface-2)] ${gridCols} ${
                  !isLast ? "border-b border-[var(--border)]" : ""
                }`}
              >
                <button
                  type="button"
                  className="absolute inset-0 z-0 cursor-pointer"
                  aria-label={`${user.name} — Zugriff anzeigen`}
                  onClick={() => setDrawerUser(user)}
                />

                <div className="relative z-[1] flex min-w-0 items-center gap-3 pointer-events-none">
                  <AdminAvatar name={user.name} size="sm" />
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="truncate text-sm font-semibold">{user.name}</span>
                      {isCurrentUser ? (
                        <span className="inline-flex h-5 items-center rounded-full border border-amber-200 bg-amber-50 px-2 text-[0.65rem] font-semibold text-amber-700">
                          Ich
                        </span>
                      ) : null}
                      {user.isPlatformSystemIdentity ? (
                        <span className="inline-flex h-5 items-center rounded-full border border-slate-200 bg-slate-50 px-2 text-[0.65rem] font-semibold text-slate-700">
                          Systemzugang
                        </span>
                      ) : null}
                    </div>
                    <p className="mt-0.5 truncate text-xs text-[var(--muted)]">{user.email}</p>
                  </div>
                </div>

                <div className="relative z-[1] pointer-events-none">
                  <div className="flex flex-wrap gap-1.5">
                    {roleChips.length > 0 ? (
                      roleChips.map((role) => (
                        <span key={role.id} className={getRoleBadgeClass(role.key)} title={role.assignmentCount > 1 ? `${role.assignmentCount} Zuweisungen` : undefined}>
                          {role.name}
                        </span>
                      ))
                    ) : user.scopedRoles && user.scopedRoles.length > 0 ? (
                      user.scopedRoles.map((s, i) => (
                        <span key={`${s.id}-${i}`} className={getRoleBadgeClass(s.key ?? s.name)}>
                          {s.name}
                        </span>
                      ))
                    ) : (
                      <span className="text-xs text-[var(--muted)]">Keine Funktion zugewiesen</span>
                    )}
                  </div>
                </div>

                <div className="relative z-[1] text-xs text-[var(--muted)] pointer-events-none">
                  {formatScopeSummary(user)}
                </div>

                <div className="relative z-[1] text-xs pointer-events-none">{formatAccessSummary(user)}</div>

                <div className="relative z-[1] pointer-events-none">
                  <AdminStatusPill label={status.label} tone={status.tone} />
                </div>

                <div className="relative z-[1] text-xs text-[var(--muted)] pointer-events-none">
                  {formatLastActivity(user.lastLoginAt)}
                </div>

                <div className="relative z-[1] flex justify-end">
                  <UserRowActionsMenu
                    userId={user.userId}
                    userName={user.name}
                    userEmail={user.email}
                    pendingInvitation={user.pendingInvitation}
                    canManageMembership={canManage && !user.isPlatformSystemIdentity}
                    canGlobalDelete={canGlobalDelete}
                    isSelf={isCurrentUser}
                    linkedPersonName={user.linkedPersonName ?? null}
                    tenantRoleNames={user.roles.map((r) => r.name)}
                  />
                </div>
              </div>
            );
          })}

          {filteredPersons.map((person, idx) => {
            const isLast = idx === filteredPersons.length - 1;
            return (
              <div
                key={person.personId}
                className={`flex flex-col gap-3 bg-[var(--surface-2)]/40 px-5 py-4 md:grid md:items-center md:gap-3 ${gridCols} ${
                  !isLast ? "border-b border-[var(--border)]" : ""
                }`}
              >
                <div className="flex min-w-0 items-center gap-3">
                  <AdminAvatar name={person.name} size="sm" />
                  <div className="min-w-0">
                    <span className="truncate text-sm font-semibold">{person.name}</span>
                    <p className="mt-0.5 truncate text-xs text-[var(--muted)]">{person.email ?? "Keine E-Mail"}</p>
                  </div>
                </div>
                <div className="text-xs text-[var(--muted)]">—</div>
                <div className="text-xs text-[var(--muted)]">—</div>
                <div className="text-xs text-[var(--muted)]">Kein Zugriff</div>
                <AdminStatusPill label="Nicht eingeladen" tone="muted" />
                <div className="text-xs text-[var(--muted)]">—</div>
                <div className="flex justify-end">
                  {canInvite && wizardConfig ? (
                    <button
                      type="button"
                      onClick={() => openWizardForPerson(person.personId, person.email ?? undefined)}
                      className="text-xs font-medium text-[var(--blue,#2563EB)] hover:underline"
                    >
                      Zugang einrichten
                    </button>
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {wizardConfig ? (
        <PeopleAccessWizardDialog
          open={wizardOpen}
          onClose={() => setWizardOpen(false)}
          availableRoles={wizardConfig.availableRoles}
          availableOrgUnits={wizardConfig.availableOrgUnits}
          permissionModuleGroups={wizardConfig.permissionModuleGroups}
          clubAdminRoleKey={wizardConfig.clubAdminRoleKey}
          privilegedRoleIds={wizardConfig.privilegedRoleIds}
          initialPersonId={wizardPersonId}
          initialEmail={wizardEmail}
          onComplete={(userId) => {
            router.push(`/dashboard/admin/users/${userId}`);
            router.refresh();
          }}
        />
      ) : null}

      <PersonAccessDrawer
        key={drawerUser?.userId ?? "closed"}
        user={drawerUser}
        open={drawerUser !== null}
        onClose={() => setDrawerUser(null)}
        currentUserId={currentUserId}
        canManage={canManage}
        canInvite={canInvite}
        privilegedRoleIds={privilegedRoleIds}
        permissionModuleGroups={wizardConfig?.permissionModuleGroups ?? []}
        onEditAccess={(userId) => {
          setDrawerUser(null);
          router.push(`/dashboard/admin/users/${userId}`);
        }}
      />
    </div>
  );
}
