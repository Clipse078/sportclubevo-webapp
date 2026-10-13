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
import PersonNavEffectiveAccessPanel from "@/components/admin/users/PersonNavEffectiveAccessPanel";
import PersonBereicheEmptyState from "@/components/admin/users/PersonBereicheEmptyState";
import { getTenantPermissionCatalog } from "@/lib/roles/tenant-queries";
import { getPersonNavEffectiveAccessSections } from "@/lib/admin/users/person-nav-effective-access";
import { buildPersonDetailAccessOverviewLine } from "@/lib/admin/users/person-detail-access-summary";
import { loadSceActivityClubGovernancePolicy } from "@/lib/sce/activity-governance/persistence/load-club-governance-policy";
import { resolvePersonClubEventGovernanceOverview } from "@/lib/admin/users/person-detail-governance-summary";
import PersonAdminActionsPanel from "@/components/admin/users/PersonAdminActionsPanel";
import PersonActivityGovernanceTabContent from "@/components/admin/users/people-access/PersonActivityGovernanceTabContent";
import PersonDetailWorkspace from "@/components/admin/users/PersonDetailWorkspace";
import PersonDetailOverviewTab from "@/components/admin/users/PersonDetailOverviewTab";
import { resolvePersonAccessStatus } from "@/lib/admin/users/person-access-status";
import { actorHasImpersonateTenantPermission } from "@/lib/admin/users/tenant-impersonation";
import {
  buildPersonDetailTabHref,
  buildPersonDetailTabNavigationConfig,
  resolvePersonDetailDefaultTab,
} from "@/lib/admin/users/person-detail-workspace-config";
import {
  CLUB_EVENT_GOVERNANCE_PEOPLE_ACCESS_CONTEXT,
  CLUB_EVENT_GOVERNANCE_PEOPLE_ACCESS_HREF,
  parseClubEventGovernanceReturnContext,
} from "@/lib/club-events/governance/club-event-governance-people-access-context";

type Props = {
  params: Promise<{ userId: string }>;
  searchParams?: Promise<{ returnContext?: string | string[]; tab?: string | string[] }>;
};

function formatDate(date: Date): string {
  return date.toLocaleDateString("de-CH", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

export default async function AdminUserDetailPage({ params, searchParams }: Props) {
  const session = await requireAnyPermission([
    PERMISSIONS.USERS_VIEW,
    PERMISSIONS.USERS_MANAGE,
  ]);

  const tenantId = session.user?.activeTenantId;
  if (!tenantId) notFound();

  const { userId } = await params;
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const fromClubEventGovernance = parseClubEventGovernanceReturnContext(
    resolvedSearchParams?.returnContext,
  );
  const peopleAccessBackHref = fromClubEventGovernance
    ? CLUB_EVENT_GOVERNANCE_PEOPLE_ACCESS_HREF
    : "/dashboard/admin/people-access";
  const peopleAccessBackLabel = fromClubEventGovernance
    ? "Zurück zu Veranstaltungs-Freigaben"
    : "Übersicht";

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
  const showClubEventGovernanceTab = Boolean(linkedPerson);

  const personDetailTabConfig = buildPersonDetailTabNavigationConfig({
    showClubEventGovernance: showClubEventGovernanceTab,
    defaultTab: resolvePersonDetailDefaultTab({
      fromClubEventGovernance,
      hasLinkedPerson: showClubEventGovernanceTab,
    }),
  });

  const primaryRoleLabel =
    tenantRoleNames.length > 0 ? tenantRoleNames[0]! : "Keine clubweite Rolle";

  const governanceReturnContext = fromClubEventGovernance
    ? CLUB_EVENT_GOVERNANCE_PEOPLE_ACCESS_CONTEXT
    : undefined;

  const [moduleGroups, governancePolicy] = await Promise.all([
    getTenantPermissionCatalog(),
    showClubEventGovernanceTab
      ? loadSceActivityClubGovernancePolicy(tenantId)
      : Promise.resolve(null),
  ]);
  const accessSections = await getPersonNavEffectiveAccessSections(tenantId, userId, moduleGroups);
  const accessOverviewLine = buildPersonDetailAccessOverviewLine(accessSections);
  const clubEventTypePolicy = governancePolicy?.activityTypes.find(
    (row) => row.activityType === "CLUB_EVENT",
  );
  const clubEventGovernanceOverview =
    linkedPerson && clubEventTypePolicy
      ? resolvePersonClubEventGovernanceOverview({
          clubEventTypePolicy,
          personId: linkedPerson.id,
        })
      : null;

  const tabLinks = {
    rollenFunktionen: buildPersonDetailTabHref({
      userId,
      tab: "rollen-funktionen",
      returnContext: governanceReturnContext,
    }),
    bereiche: buildPersonDetailTabHref({
      userId,
      tab: "bereiche",
      returnContext: governanceReturnContext,
    }),
    veranstaltungsFreigaben: buildPersonDetailTabHref({
      userId,
      tab: "veranstaltungs-freigaben",
      returnContext: governanceReturnContext,
    }),
    zugriff: buildPersonDetailTabHref({
      userId,
      tab: "zugriff",
      returnContext: governanceReturnContext,
    }),
  };

  return (
    <div className="mx-auto max-w-5xl space-y-6" data-testid="person-detail-workspace-root">
      <AdminSectionHeader
        eyebrow="Personen & Zugänge"
        title={displayName}
        actions={
          <Link
            href={peopleAccessBackHref}
            className="fca-button-secondary inline-flex items-center gap-1.5"
            data-testid="people-access-back-link"
            data-return-context={fromClubEventGovernance ? "club-event-governance" : "default"}
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            {peopleAccessBackLabel}
          </Link>
        }
      />

      <header
        className="sce-detail-section overflow-hidden"
        data-testid="person-detail-header"
      >
        <div className="sce-detail-section-body">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex min-w-0 items-start gap-4">
              <AdminAvatar name={displayName} size="lg" />
              <div className="min-w-0 space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="text-xl font-semibold text-[var(--foreground)]">{displayName}</h1>
                  {isSelf ? (
                    <span className="rounded-full border border-amber-500/40 bg-amber-950/30 px-2 py-0.5 text-[0.65rem] font-semibold text-amber-200">
                      Ich
                    </span>
                  ) : null}
                  <AdminStatusPill label={accessStatus.primaryLabel} tone={accessStatus.tone} />
                </div>
                <p className="flex items-center gap-2 text-sm text-[var(--text-2)]">
                  <ProductDomainSceIcon
                    name="communication"
                    size={12}
                    className="h-3.5 w-3.5 shrink-0 text-[var(--muted)]"
                  />
                  {user.email}
                </p>
                <p className="text-xs text-[var(--muted)]">
                  Primäre Rolle:{" "}
                  <span className="font-medium text-[var(--text-2)]">{primaryRoleLabel}</span>
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
      </header>

      <div className="sce-detail-section overflow-hidden">
        <div className="sce-detail-section-body pt-2">
          <PersonDetailWorkspace
            config={personDetailTabConfig}
            uebersicht={
              <div className="space-y-5">
                <PersonDetailOverviewTab
                  accessStatus={accessStatus}
                  membershipJoinedLabel={formatDate(membership.joinedAt)}
                  tenantRoleNames={tenantRoleNames}
                  scopedAssignmentCount={scopedItems.length}
                  showClubEventGovernanceTab={showClubEventGovernanceTab}
                  clubEventGovernanceOverview={clubEventGovernanceOverview}
                  accessOverviewLine={accessOverviewLine}
                  tabLinks={tabLinks}
                />
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
              </div>
            }
            rollenFunktionen={
              <div className="space-y-3">
                <div className="space-y-1">
                  <h2 className="text-base font-semibold text-[var(--foreground)]">
                    Rollen &amp; Funktionen
                  </h2>
                  <p className="text-sm text-[var(--text-2)]">
                    Clubweite Rollen und Funktionen für diese Person.
                  </p>
                </div>
                <TenantRoleAssignmentControl
                  userId={userId}
                  availableRoles={availableRoles}
                  initialRoleIds={user.userRoles.map((ur) => ur.role.id)}
                  canManage={canManage && !accessStatus.isPendingInvitation}
                />
              </div>
            }
            bereiche={
              <div className="space-y-3">
                <div className="space-y-1">
                  <h2 className="text-base font-semibold text-[var(--foreground)]">
                    Bereiche &amp; Zuständigkeiten
                  </h2>
                  <p className="text-sm text-[var(--text-2)]">
                    Bereichsbezogene Rollen und organisatorische Zuständigkeiten.
                  </p>
                </div>
                {canManage && !accessStatus.isPendingInvitation ? (
                  <ScopedRoleManagementControl
                    userId={userId}
                    assignments={scopedItems}
                    availableRoles={availableScopedRoles}
                    availableOrgUnits={availableOrgUnits}
                    canManage
                  />
                ) : scopedItems.length === 0 ? (
                  <PersonBereicheEmptyState />
                ) : (
                  <ScopedRoleManagementControl
                    userId={userId}
                    assignments={scopedItems}
                    availableRoles={availableScopedRoles}
                    availableOrgUnits={availableOrgUnits}
                    canManage={false}
                  />
                )}
              </div>
            }
            veranstaltungsFreigaben={
              linkedPerson ? (
                <PersonActivityGovernanceTabContent personId={linkedPerson.id} canManage={canManage} />
              ) : null
            }
            zugriff={<PersonNavEffectiveAccessPanel sections={accessSections} />}
          />
        </div>
      </div>
    </div>
  );
}
