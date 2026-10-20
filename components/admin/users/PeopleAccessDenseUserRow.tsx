"use client";

import AdminAvatar from "@/components/admin/shared/AdminAvatar";
import AdminStatusPill from "@/components/admin/shared/AdminStatusPill";
import UserRowActionsMenu from "@/components/admin/users/UserRowActionsMenu";
import {
  SceDenseGridCell,
  SceDenseGridRow,
  SceDenseRowActions,
  SceEntityIdentity,
} from "@/components/sce/dense";
import { buildAccessColumnSummary } from "@/lib/admin/people-access/access-column-summary";
import { groupRoleChipsForDisplay } from "@/lib/admin/people-access/role-display";
import { SCE_PEOPLE_ACCESS_DENSE_GRID } from "@/lib/design-system/sce-dense-ui-foundation";
import { SCE_DENSE_META_CHIP_CLASS, SCE_DENSE_META_TEXT_CLASS } from "@/lib/design-system/sce-dense-ui-micro-ux";
import type { TenantUserItem } from "@/lib/users/queries";
import { cn } from "@/lib/cn";

function getRoleBadgeClass(roleKey: string): string {
  const k = roleKey.toLowerCase();
  if (k.includes("superadmin") || k.includes("super_admin")) return "sce-role-badge sce-role-badge-admin";
  if (k.includes("admin")) return "sce-role-badge sce-role-badge-admin";
  if (k.includes("trainer")) return "sce-role-badge sce-role-badge-trainer";
  if (k.includes("staff")) return "sce-role-badge sce-role-badge-staff";
  return "sce-role-badge sce-role-badge-member";
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

export type PeopleAccessDenseUserRowProps = {
  user: TenantUserItem;
  isCurrentUser: boolean;
  status: { label: string; tone: "success" | "warning" | "muted" };
  onOpenDrawer: (user: TenantUserItem) => void;
  actorUserId: string;
  canImpersonateTarget: boolean;
  canManage: boolean;
  canGlobalDelete: boolean;
  onEditAccess: (userId: string) => void;
};

export function PeopleAccessDenseUserRow({
  user,
  isCurrentUser,
  status,
  onOpenDrawer,
  actorUserId,
  canImpersonateTarget,
  canManage,
  canGlobalDelete,
  onEditAccess,
}: PeopleAccessDenseUserRowProps) {
  const roleChips = groupRoleChipsForDisplay(user.roles);
  const access = buildAccessColumnSummary(user);

  const identityBadges = (
    <>
      {isCurrentUser ? (
        <span className={cn(SCE_DENSE_META_CHIP_CLASS, "border-amber-200/80 bg-amber-500/10 text-amber-800")}>
          Ich
        </span>
      ) : null}
      {user.isPlatformSystemIdentity ? (
        <span className={cn(SCE_DENSE_META_CHIP_CLASS, "text-[var(--text-2)]")}>Systemzugang</span>
      ) : null}
    </>
  );

  const functionCell =
    roleChips.length > 0 ? (
      <div className="flex flex-wrap gap-1">
        {roleChips.map((role) => (
          <span
            key={role.id}
            className={cn(getRoleBadgeClass(role.key), "max-w-full truncate text-[0.6875rem] leading-tight")}
            title={role.assignmentCount > 1 ? `${role.assignmentCount} Zuweisungen` : undefined}
          >
            {role.name}
          </span>
        ))}
      </div>
    ) : user.scopedRoles && user.scopedRoles.length > 0 ? (
      <div className="flex flex-wrap gap-1">
        {user.scopedRoles.map((s, i) => (
          <span key={`${s.id}-${i}`} className={cn(getRoleBadgeClass(s.key ?? s.name), "text-[0.6875rem]")}>
            {s.name}
          </span>
        ))}
      </div>
    ) : (
      <span className={SCE_DENSE_META_TEXT_CLASS}>Keine Funktion zugewiesen</span>
    );

  return (
    <SceDenseGridRow
      gridClassName={SCE_PEOPLE_ACCESS_DENSE_GRID}
      onActivate={() => onOpenDrawer(user)}
      activateLabel={`${user.name} — Zugriff anzeigen`}
      data-testid={`people-access-row-${user.userId}`}
      mobileMeta={
        <>
          <div>
            <span className="text-[var(--muted)]">Funktion</span>
            <div className="mt-0.5">{functionCell}</div>
          </div>
          <div>
            <span className="text-[var(--muted)]">Bereich</span>
            <p className="mt-0.5 text-[var(--foreground)]">{formatScopeSummary(user)}</p>
          </div>
          <div>
            <span className="text-[var(--muted)]">Zugriff</span>
            <p className="mt-0.5 font-medium text-[var(--foreground)]">{access.primary}</p>
          </div>
          <div>
            <span className="text-[var(--muted)]">Status</span>
            <div className="mt-0.5">
              <AdminStatusPill label={status.label} tone={status.tone} />
            </div>
          </div>
        </>
      }
    >
      <SceDenseGridCell className="md:col-span-1">
        <SceEntityIdentity
          primary={user.name}
          secondary={user.email}
          leading={<AdminAvatar name={user.name} size="sm" />}
          badges={identityBadges}
        />
      </SceDenseGridCell>

      <SceDenseGridCell hideOnMobile>{functionCell}</SceDenseGridCell>

      <SceDenseGridCell hideOnMobile>
        <span className={SCE_DENSE_META_TEXT_CLASS}>{formatScopeSummary(user)}</span>
      </SceDenseGridCell>

      <SceDenseGridCell hideOnMobile>
        <span>
          <span className="block text-xs font-medium text-[var(--foreground)]">{access.primary}</span>
          {access.secondary ? (
            <span className={cn("block", SCE_DENSE_META_TEXT_CLASS)}>{access.secondary}</span>
          ) : null}
        </span>
      </SceDenseGridCell>

      <SceDenseGridCell hideOnMobile align="end">
        <AdminStatusPill label={status.label} tone={status.tone} />
      </SceDenseGridCell>

      <SceDenseGridCell hideOnMobile align="end">
        <span className={cn("tabular-nums", SCE_DENSE_META_TEXT_CLASS)}>{formatLastActivity(user.lastLoginAt)}</span>
      </SceDenseGridCell>

      <SceDenseGridCell align="end">
        <SceDenseRowActions>
          <UserRowActionsMenu
            userId={user.userId}
            userName={user.name}
            userEmail={user.email}
            pendingInvitation={user.pendingInvitation}
            canManageMembership={canManage && !user.isPlatformSystemIdentity}
            canGlobalDelete={canGlobalDelete}
            isSelf={user.userId === actorUserId}
            canImpersonateTarget={canImpersonateTarget}
            canShowAdminShortcuts={canManage && !user.isPlatformSystemIdentity}
            onEditAccess={onEditAccess}
            linkedPersonName={user.linkedPersonName ?? null}
            tenantRoleNames={user.roles.map((r) => r.name)}
          />
        </SceDenseRowActions>
      </SceDenseGridCell>
    </SceDenseGridRow>
  );
}
