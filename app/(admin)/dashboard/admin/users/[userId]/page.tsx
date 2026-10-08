import Link from "next/link";
import { ProductDomainSceIcon } from "@/components/icons/ProductDomainSceIcon";
import { notFound } from "next/navigation";
import { ArrowLeft, Calendar, UserRound } from "lucide-react";
import { requireAnyPermission } from "@/lib/permissions/require-any-permission";
import { hasPermission } from "@/lib/permissions/has-permission";
import { PERMISSIONS } from "@/lib/permissions/permissions";
import { getTenantUserDetail } from "@/lib/users/queries";
import { getTenantRolesOverview } from "@/lib/roles/tenant-queries";
import { getScopedAssignmentsForUser } from "@/lib/roles/scoped-mutations";
import { getOrgUnitsForTenant } from "@/lib/people/queries";
import AdminSectionHeader from "@/components/admin/shared/AdminSectionHeader";
import AdminAvatar from "@/components/admin/shared/AdminAvatar";
import AdminStatusPill from "@/components/admin/shared/AdminStatusPill";
import TenantRoleAssignmentControl from "@/components/admin/users/TenantRoleAssignmentControl";
import ScopedRoleManagementControl from "@/components/admin/users/ScopedRoleManagementControl";
import PersonNavEffectiveAccessCard from "@/components/admin/users/PersonNavEffectiveAccessCard";
import PersonAdminActionsPanel from "@/components/admin/users/PersonAdminActionsPanel";
import { resolvePersonAccessStatus } from "@/lib/admin/users/person-access-status";
import { actorHasImpersonateTenantPermission } from "@/lib/admin/users/tenant-impersonation";

type Props = {
  params: Promise<{ userId: string }>;
};

function formatDate(date: Date): string {
  return date.toLocaleDateString("de-CH", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

export default async function AdminUserDetailPage({ params }: Props) {
  const session = await requireAnyPermission([
    PERMISSIONS.USERS_VIEW,
    PERMISSIONS.USERS_MANAGE,
  ]);

  const tenantId = session.user?.activeTenantId;
  if (!tenantId) notFound();

  const { userId } = await params;

  const [membership, allTenantRoles, scopedAssignments, orgUnits] = await Promise.all([
    getTenantUserDetail(tenantId, userId),
    getTenantRolesOverview(tenantId),
    getScopedAssignmentsForUser(tenantId, userId),
    getOrgUnitsForTenant(tenantId),
  ]);
  if (!membership) notFound();

  const availableRoles = allTenantRoles
    .filter((r) => !r.isArchived)
    .map((r) => ({ id: r.id, name: r.name, isSystem: r.isSystem }));

  const availableScopedRoles = allTenantRoles
    .filter((r) => !r.isArchived)
    .map((r) => ({ id: r.id, name: r.name }));

  const availableOrgUnits = orgUnits.map((u) => ({ id: u.id, name: u.name }));

  const user = membership.user;
  const displayName = `${user.firstName} ${user.lastName}`;

  const canManage =
    hasPermission(session, PERMISSIONS.USERS_MANAGE_MEMBERSHIPS) ||
    hasPermission(session, PERMISSIONS.USERS_MANAGE);
  const canInvite = hasPermission(session, PERMISSIONS.USERS_INVITE);
  const actorUserId = session.user.actorUserId ?? session.user.id;
  const canImpersonate =
    !session.user.isImpersonating &&
    actorUserId === (session.user.effectiveUserId ?? session.user.id) &&
    (await actorHasImpersonateTenantPermission(actorUserId, tenantId));
  const isSelf = actorUserId === userId;

  const linkedPerson = user.person;
  const pendingInvitation = user.passwordResetTokens.length > 0;

  const accessStatus = resolvePersonAccessStatus({
    pendingInvitation,
    membershipIsActive: membership.isActive,
    userIsActive: user.isActive,
  });

  const scopedItems = scopedAssignments.map((a) => ({
    id: a.id,
    roleId: a.roleId,
    roleName: a.roleName,
    roleKey: a.roleKey,
    orgUnitId: a.orgUnitId,
    orgUnitName: a.orgUnitName,
    scopeMode: a.scopeMode,
  }));

  const tenantRoleNames = user.userRoles.map((ur) => ur.role.name);

  return (
    <div className="space-y-6">
      <AdminSectionHeader
        eyebrow="Personen & Zugänge"
        title={displayName}
        actions={
          <Link href="/dashboard/admin/people-access" className="fca-button-secondary inline-flex items-center gap-1.5">
            <ArrowLeft className="h-3.5 w-3.5" />
            Übersicht
          </Link>
        }
      />

      {/* Person hero */}
      <section className="sce-detail-section overflow-hidden">
        <div className="sce-detail-section-body">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex min-w-0 items-start gap-4">
              <AdminAvatar name={displayName} size="lg" />
              <div className="min-w-0 space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-xl font-semibold text-[var(--foreground)]">{displayName}</h2>
                  {isSelf ? (
                    <span className="rounded-full border border-amber-500/40 bg-amber-950/30 px-2 py-0.5 text-[0.65rem] font-semibold text-amber-200">
                      Ich
                    </span>
                  ) : null}
                  <AdminStatusPill label={accessStatus.primaryLabel} tone={accessStatus.tone} />
                </div>
                <p className="flex items-center gap-2 text-sm text-[var(--text-2)]">
                  <ProductDomainSceIcon name="communication" size={12} className="h-3.5 w-3.5 shrink-0 text-[var(--muted)]" />
                  {user.email}
                </p>
                <p className="flex items-center gap-2 text-sm text-[var(--muted)]">
                  <Calendar className="h-3.5 w-3.5 shrink-0" />
                  {user.lastLoginAt
                    ? `Letzter Login: ${formatDate(user.lastLoginAt)}`
                    : "Noch nie eingeloggt"}
                </p>
                {linkedPerson ? (
                  <Link
                    href={`/dashboard/persons/${linkedPerson.id}`}
                    className="inline-flex items-center gap-1.5 text-xs font-medium text-[var(--sce-primary)] hover:underline"
                  >
                    <UserRound className="h-3 w-3" />
                    Personendatensatz: {linkedPerson.firstName} {linkedPerson.lastName}
                  </Link>
                ) : null}
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_320px]">
        <div className="space-y-5">
          <div className="sce-detail-section">
            <div className="sce-detail-section-header">
              <p className="text-xs font-semibold uppercase tracking-[0.1em] text-[var(--muted)]">
                Funktionen & Rollen
              </p>
            </div>
            <div className="sce-detail-section-body space-y-5">
              <div>
                <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--muted)]">
                  Clubweit
                </p>
                <TenantRoleAssignmentControl
                  userId={userId}
                  availableRoles={availableRoles}
                  initialRoleIds={user.userRoles.map((ur) => ur.role.id)}
                  canManage={canManage && !accessStatus.isPendingInvitation}
                />
              </div>
              <div>
                <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--muted)]">
                  Bereiche / Zuständigkeiten
                </p>
                {scopedItems.length === 0 ? (
                  <p className="rounded-[var(--radius-md)] border border-dashed border-[var(--border)] bg-[var(--surface-2)]/50 px-4 py-3 text-sm text-[var(--muted)]">
                    Keine bereichsbezogenen Zuständigkeiten zugewiesen.
                  </p>
                ) : (
                  <ScopedRoleManagementControl
                    userId={userId}
                    assignments={scopedItems}
                    availableRoles={availableScopedRoles}
                    availableOrgUnits={availableOrgUnits}
                    canManage={canManage && !accessStatus.isPendingInvitation}
                  />
                )}
              </div>
            </div>
          </div>

          <PersonNavEffectiveAccessCard tenantId={tenantId} userId={userId} />
        </div>

        <aside className="space-y-5">
          <PersonAdminActionsPanel
            userId={userId}
            userName={displayName}
            userEmail={user.email}
            membershipIsActive={membership.isActive}
            userIsActive={user.isActive}
            pendingInvitation={pendingInvitation}
            canManage={canManage}
            canInvite={canInvite}
            canImpersonate={canImpersonate}
            isSelf={isSelf}
            linkedPersonName={
              linkedPerson ? `${linkedPerson.firstName} ${linkedPerson.lastName}` : null
            }
            tenantRoleNames={tenantRoleNames}
            accessStatus={accessStatus}
          />

          <div className="sce-detail-section">
            <div className="sce-detail-section-header">
              <p className="text-xs font-semibold uppercase tracking-[0.1em] text-[var(--muted)]">
                Mitgliedschaft
              </p>
            </div>
            <div className="sce-detail-section-body space-y-3">
              <div className="sce-data-field">
                <span className="sce-data-label">Beigetreten</span>
                <span className="sce-data-value">{formatDate(membership.joinedAt)}</span>
              </div>
              <div className="sce-data-field">
                <span className="sce-data-label">Kontostatus</span>
                <span className="sce-data-value">{accessStatus.primaryLabel}</span>
              </div>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
