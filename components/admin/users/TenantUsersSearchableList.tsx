"use client";
import { ProductDomainSceIcon } from "@/components/icons/ProductDomainSceIcon";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { UserPlus } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { SCE_KPI_CARD_SURFACE } from "@/lib/shell/sce-surface-system";
import { cn } from "@/lib/cn";
import AdminAvatar from "@/components/admin/shared/AdminAvatar";
import AdminStatusPill from "@/components/admin/shared/AdminStatusPill";
import { PeopleAccessDenseUserRow } from "@/components/admin/users/PeopleAccessDenseUserRow";
import { SceEmptyState } from "@/components/sce/feedback/SceEmptyState";
import {
  SceDenseGridHeader,
  SceDenseGridHeaderCell,
  SceDenseResultCount,
  SceDenseSurface,
  SceDenseToolbar,
  SceEntityIdentity,
} from "@/components/sce/dense";
import { SceSearchField } from "@/components/sce/forms/SceSearchField";
import SceToolbarSelect from "@/components/ui/SceToolbarSelect";
import PeopleAccessWizardDialog from "@/components/admin/users/people-access/PeopleAccessWizardDialog";
import PersonAccessDrawer from "@/components/admin/users/people-access/PersonAccessDrawer";
import { buildPersonDetailZugriffHref } from "@/lib/admin/users/person-quick-view-config";
import type { WizardRoleOption } from "@/components/admin/users/people-access/PeopleAccessWizard";
import type { PermissionMatrixModuleGroup } from "@/components/admin/roles/NavAlignedPermissionEditor";
import { userHasPrivilegedRole } from "@/lib/admin/people-access/privileged-utils";
import { SCE_PEOPLE_ACCESS_DENSE_GRID } from "@/lib/design-system/sce-dense-ui-foundation";
import { SCE_DENSE_META_TEXT_CLASS } from "@/lib/design-system/sce-dense-ui-micro-ux";
import type { TenantUserItem, TenantPersonWithoutUser } from "@/lib/users/queries";
import { canShowImpersonateTenantUserAction } from "@/lib/admin/users/tenant-impersonation-eligibility";

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
  /** Real authenticated actor (defaults to currentUserId when omitted). */
  actorUserId?: string;
  canImpersonateTenant?: boolean;
  canInvite: boolean;
  canManage?: boolean;
  canGlobalDelete?: boolean;
  wizardConfig?: PeopleAccessWizardConfig;
};

type StatusFilter = "all" | "active" | "deactivated" | "pending" | "not_invited" | "privileged";

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

export default function TenantUsersSearchableList({
  initialUsers,
  personsWithoutUser,
  currentUserId,
  actorUserId = currentUserId,
  canImpersonateTenant = false,
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
            className={cn(
              "sce-kpi-card text-left transition ring-offset-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--blue)]/40",
              SCE_KPI_CARD_SURFACE,
              statusFilter === kpi.key ? "ring-2 ring-[var(--blue)]/30" : "",
            )}
          >
            <p className="sce-data-label">{kpi.label}</p>
            <p className={`mt-1.5 text-2xl font-bold ${kpi.color}`} style={{ fontFamily: "var(--font-display)" }}>
              {kpi.value}
            </p>
            <p className="mt-1 text-xs text-[var(--muted)]">{kpi.sub}</p>
          </button>
        ))}
      </div>

      <SceDenseSurface feedbackSurfaceId="people-access-list" aria-label="Personenliste">
        <SceDenseToolbar
          footer={
            isFiltered ? <SceDenseResultCount shown={totalShown} total={grandTotal} label="Einträge" /> : undefined
          }
        >
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-[minmax(0,1fr)_auto_auto] lg:grid-cols-[minmax(12rem,1fr)_minmax(7.5rem,auto)_minmax(7.5rem,auto)_minmax(8rem,auto)_auto] lg:items-center">
            <SceSearchField
              value={query}
              onChange={setQuery}
              placeholder="Name oder E-Mail suchen…"
              ariaLabel="Personen suchen"
              testId="people-access-search"
              shellClassName="sm:col-span-2 md:col-span-1 lg:col-span-1"
            />

            <SceToolbarSelect
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
              className="lg:w-auto"
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
            </SceToolbarSelect>

            {uniqueRoles.length > 0 ? (
              <SceToolbarSelect
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
                className="lg:w-auto"
                aria-label="Funktion filtern"
              >
                <option value="all">Alle Funktionen</option>
                {uniqueRoles.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name}
                  </option>
                ))}
              </SceToolbarSelect>
            ) : null}

            <input
              type="search"
              placeholder="Alle Bereiche"
              value={scopeQuery}
              onChange={(e) => setScopeQuery(e.target.value)}
              className="fca-input h-9 w-full min-w-0 text-sm lg:w-auto"
              aria-label="Bereich filtern"
            />

            {canInvite && wizardConfig ? (
              <Button
                type="button"
                onClick={() => openWizardForPerson()}
                className="h-9 w-full sm:col-span-2 md:col-span-3 lg:col-span-1 lg:w-auto"
                data-sce-action-hierarchy="PRIMARY"
                data-testid="people-access-add-person"
              >
                <UserPlus className="mr-1.5 h-4 w-4 shrink-0" aria-hidden />
                Person hinzufügen
              </Button>
            ) : null}
          </div>
        </SceDenseToolbar>

        {grandTotal === 0 ? (
          <SceEmptyState
            variant="FIRST_USE"
            layout="compact-stacked"
            contained
            icon={<ProductDomainSceIcon name="people" size={24} />}
            title="Noch keine Personen mit Zugang"
            description="Füge die erste Person hinzu, um Zugang zu SportClubEvo zu vergeben."
            primaryAction={
              canInvite && wizardConfig ? (
                <Button type="button" onClick={() => openWizardForPerson()} data-sce-action-hierarchy="PRIMARY">
                  <UserPlus className="mr-1.5 h-4 w-4 shrink-0" aria-hidden />
                  Person hinzufügen
                </Button>
              ) : undefined
            }
            data-testid="people-access-empty-first-use"
          />
        ) : totalShown === 0 ? (
          <SceEmptyState
            variant="FILTERED_NO_RESULTS"
            layout="compact-stacked"
            contained
            title="Keine Personen gefunden"
            description="Für die aktuellen Such- oder Filterkriterien wurden keine Personen gefunden."
            primaryAction={
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
                  data-testid="people-access-reset-filters"
                >
                  Filter zurücksetzen
                </button>
              ) : undefined
            }
            data-testid="people-access-empty-filtered"
          />
        ) : (
          <div role="table" aria-label="Personen und Zugänge" className="bg-[var(--surface)]">
            <SceDenseGridHeader gridClassName={SCE_PEOPLE_ACCESS_DENSE_GRID}>
              <SceDenseGridHeaderCell>Person</SceDenseGridHeaderCell>
              <SceDenseGridHeaderCell>Funktion</SceDenseGridHeaderCell>
              <SceDenseGridHeaderCell>Bereich</SceDenseGridHeaderCell>
              <SceDenseGridHeaderCell>Zugriff</SceDenseGridHeaderCell>
              <SceDenseGridHeaderCell>Status</SceDenseGridHeaderCell>
              <SceDenseGridHeaderCell align="end">Letzte Aktivität</SceDenseGridHeaderCell>
              <SceDenseGridHeaderCell align="end">
                <span className="sr-only">Aktionen</span>
              </SceDenseGridHeaderCell>
            </SceDenseGridHeader>

            {filteredUsers.map((user) => {
              const isCurrentUser = user.userId === currentUserId;
              const canImpersonateTarget = canShowImpersonateTenantUserAction({
                actorCanImpersonate: canImpersonateTenant,
                actorUserId,
                targetUserId: user.userId,
                pendingInvitation: user.pendingInvitation,
                membershipIsActive: user.membershipIsActive,
                userIsActive: user.userIsActive,
                isPlatformSystemIdentity: user.isPlatformSystemIdentity,
              });
              const status = getAccessStatusLabel(user);

              return (
                <PeopleAccessDenseUserRow
                  key={user.userId}
                  user={user}
                  isCurrentUser={isCurrentUser}
                  status={status}
                  onOpenDrawer={setDrawerUser}
                  actorUserId={actorUserId}
                  canImpersonateTarget={canImpersonateTarget}
                  canManage={canManage}
                  canGlobalDelete={canGlobalDelete}
                  onEditAccess={(userId) => router.push(buildPersonDetailZugriffHref(userId))}
                />
              );
            })}

            {filteredPersons.map((person) => (
              <div
                key={person.personId}
                className={cn(
                  "flex flex-col gap-3 border-b border-[var(--border)] bg-[var(--surface-2)]/30 px-4 py-3 md:grid md:items-center md:gap-3 md:px-5 md:py-3.5",
                  SCE_PEOPLE_ACCESS_DENSE_GRID,
                )}
                data-testid={`people-access-person-row-${person.personId}`}
              >
                <SceEntityIdentity
                  primary={person.name}
                  secondary={person.email ?? "Keine E-Mail"}
                  leading={<AdminAvatar name={person.name} size="sm" />}
                />
                <div className={`hidden md:block ${SCE_DENSE_META_TEXT_CLASS}`}>—</div>
                <div className={`hidden md:block ${SCE_DENSE_META_TEXT_CLASS}`}>—</div>
                <div className={`hidden md:block ${SCE_DENSE_META_TEXT_CLASS}`}>Kein Zugriff</div>
                <div className="hidden md:block">
                  <AdminStatusPill label="Nicht eingeladen" tone="muted" />
                </div>
                <div className={`hidden md:block ${SCE_DENSE_META_TEXT_CLASS}`}>—</div>
                <div className="flex justify-end md:justify-end">
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
            ))}
          </div>
        )}
      </SceDenseSurface>

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
        actorUserId={actorUserId}
        canImpersonateTenant={canImpersonateTenant}
        canManage={canManage}
        canInvite={canInvite}
        privilegedRoleIds={privilegedRoleIds}
        permissionModuleGroups={wizardConfig?.permissionModuleGroups ?? []}
        onEditAccess={(userId) => {
          setDrawerUser(null);
          router.push(buildPersonDetailZugriffHref(userId));
        }}
      />
    </div>
  );
}
