import Link from "next/link";
import { ProductDomainSceIcon } from "@/components/icons/ProductDomainSceIcon";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  Hash,
  KeyRound,
  Pencil,
  UserCog,
} from "lucide-react";
import UserForm from "@/components/admin/users/UserForm";
import UserRolesForm from "@/components/admin/users/UserRolesForm";
import ResetPasswordForm from "@/components/admin/users/ResetPasswordForm";
import DeleteUserButton from "@/components/admin/users/DeleteUserButton";
import GlobalUserDeleteButton from "@/components/admin/users/GlobalUserDeleteButton";
import ImpersonateButton from "@/components/admin/users/ImpersonateButton";
import { requirePermission } from "@/lib/permissions/require-permission";
import { hasPermission } from "@/lib/permissions/has-permission";
import { PERMISSIONS } from "@/lib/permissions/permissions";
import { createEffectivePermissionResolver } from "@/lib/permissions/services/effective-permission-resolver";
import { prisma } from "@/lib/db/prisma";
import { getPlatformRolesListData, getUserDetailData } from "@/lib/users/queries";
import { PageShell } from "@/components/ui/page";
import { DetailPagePattern } from "@/components/ui/patterns";

type UserDetailPageProps = {
  params: Promise<{
    userId: string;
  }>;
};

function formatDate(date: Date): string {
  return date.toLocaleDateString("de-CH", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

export default async function UserDetailPage({
  params,
}: UserDetailPageProps) {
  const session = await requirePermission(PERMISSIONS.USERS_MANAGE);
  const canImpersonate = hasPermission(session, PERMISSIONS.USERS_IMPERSONATE);

  // Resolve platform-level global delete authority (SCE Super Admin only)
  const resolver = createEffectivePermissionResolver(prisma);
  const canGlobalDelete = await resolver.hasPermission({
    userId: session.user.id,
    permission: PERMISSIONS.USERS_DELETE,
  });

  const { userId } = await params;
  const user = await getUserDetailData(userId);

  if (!user) {
    notFound();
  }

  const roles = await getPlatformRolesListData();

  // RPERM-05-C1 (Finding 3): the platform user-role form only ever manages
  // PLATFORM-scoped roles — tenant roles are rendered as a read-only
  // summary below, linking to the tenant administration module rather
  // than being editable through this global form.
  const platformUserRoles = user.userRoles.filter((userRole) => userRole.role.scope === "PLATFORM");
  const tenantUserRoles = user.userRoles.filter((userRole) => userRole.role.scope === "TENANT");
  const initialRoleIds = platformUserRoles.map((userRole) => userRole.role.id);
  const displayName = `${user.firstName} ${user.lastName}`;

  return (
    <PageShell fullWidth>
      <DetailPagePattern
        eyebrow="Benutzerkonto"
        title={displayName}
        description={
          user.lastLoginAt
            ? `${user.email} · Letzter Login ${formatDate(user.lastLoginAt)}`
            : `${user.email} · Noch nie eingeloggt`
        }
        breadcrumbs={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Benutzer", href: "/dashboard/users" },
          { label: displayName },
        ]}
        headerBadge={
          <span
            className={
              user.isActive
                ? "inline-flex h-5 items-center rounded-full border border-emerald-200 bg-emerald-50 px-2.5 text-[0.65rem] font-semibold text-emerald-700"
                : "inline-flex h-5 items-center rounded-full border border-[var(--border)] bg-[var(--surface-2)] px-2.5 text-[0.65rem] font-semibold text-[var(--muted)]"
            }
          >
            {user.isActive ? "Aktiv" : "Inaktiv"}
          </span>
        }
        headerActions={
          <>
            {canImpersonate ? <ImpersonateButton userId={user.id} variant="default" /> : null}
            <Link
              href="/dashboard/users"
              className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-4 py-2 text-sm font-medium text-[var(--text-2)] transition hover:bg-[var(--surface-2)]"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Zurück
            </Link>
          </>
        }
      >
      {/* ── Content grid ─────────────────────────────────────────────────── */}
      <div className="grid gap-5 xl:grid-cols-[1fr_320px]">
        {/* Main column */}
        <div className="space-y-5">
          {/* Account Information */}
          <div className="sce-detail-section">
            <div className="sce-detail-section-header">
              <div className="flex items-center gap-2">
                <Pencil className="h-4 w-4 text-[var(--muted)]" />
                <p className="text-xs font-semibold uppercase tracking-[0.1em] text-[var(--muted)]">
                  Kontoinformationen
                </p>
              </div>
              <div className="flex items-center gap-2">
                <DeleteUserButton userId={user.id} isActive={user.isActive} />
                {canGlobalDelete && user.id !== session.user.id ? (
                  <GlobalUserDeleteButton
                    userId={user.id}
                    userName={displayName}
                    userEmail={user.email}
                  />
                ) : null}
              </div>
            </div>
            <div className="sce-detail-section-body">
              <UserForm
                mode="edit"
                userId={user.id}
                initialValues={{
                  firstName: user.firstName,
                  lastName: user.lastName,
                  email: user.email,
                  isActive: user.isActive,
                }}
              />
            </div>
          </div>

          {/* Platform Roles & Access */}
          <div className="sce-detail-section">
            <div className="sce-detail-section-header">
              <div className="flex items-center gap-2">
                <ProductDomainSceIcon name="roles-access" size={16} className="h-4 w-4 text-[var(--muted)]" />
                <p className="text-xs font-semibold uppercase tracking-[0.1em] text-[var(--muted)]">
                  Plattform-Rollen
                </p>
                {platformUserRoles.length > 0 ? (
                  <span className="sce-count-badge">
                    {platformUserRoles.length}
                  </span>
                ) : null}
              </div>
            </div>
            <div className="sce-detail-section-body">
              <UserRolesForm
                userId={user.id}
                initialRoles={roles}
                initialSelectedRoleIds={initialRoleIds}
              />
            </div>
          </div>

          {/* Tenant Roles — read-only summary (RPERM-05-C1: managed exclusively
              through the tenant administration module, never through this
              global platform form). */}
          <div className="sce-detail-section">
            <div className="sce-detail-section-header">
              <div className="flex items-center gap-2">
                <ProductDomainSceIcon name="roles-access" size={16} className="h-4 w-4 text-[var(--muted)]" />
                <p className="text-xs font-semibold uppercase tracking-[0.1em] text-[var(--muted)]">
                  Mandanten-Rollen
                </p>
                {tenantUserRoles.length > 0 ? (
                  <span className="sce-count-badge">
                    {tenantUserRoles.length}
                  </span>
                ) : null}
              </div>
            </div>
            <div className="sce-detail-section-body">
              {tenantUserRoles.length === 0 ? (
                <div className="fca-status-box fca-status-box-muted">
                  Keine Mandanten-Rollen zugewiesen.
                </div>
              ) : (
                <div className="space-y-3">
                  <p className="text-sm text-[var(--text-2)]">
                    Nur lesbar. Mandanten-Rollen werden ausschliesslich über die
                    Mandanten-Rollenverwaltung des jeweiligen Mandanten geändert.
                  </p>
                  <div className="divide-y divide-[var(--border)]">
                    {tenantUserRoles.map((userRole) => (
                      <div
                        key={userRole.role.id}
                        className="flex items-center justify-between gap-4 py-3 first:pt-0 last:pb-0"
                      >
                        <div>
                          <p className="text-sm font-medium text-[var(--foreground)]">
                            {userRole.role.name}
                          </p>
                          <p className="text-[0.75rem] text-[var(--muted)]">
                            {userRole.role.tenant?.name ?? "Unbekannter Mandant"}
                          </p>
                        </div>
                        {userRole.role.tenant ? (
                          <Link
                            href={`/dashboard/administration/roles/${userRole.role.id}`}
                            className="text-[0.75rem] font-medium text-[var(--blue)] hover:underline"
                          >
                            Verwalten
                          </Link>
                        ) : null}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-5">
          {/* Assigned Person */}
          <div className="sce-detail-section">
            <div className="sce-detail-section-header">
              <div className="flex items-center gap-2">
                <UserCog className="h-4 w-4 text-[var(--muted)]" />
                <p className="text-xs font-semibold uppercase tracking-[0.1em] text-[var(--muted)]">
                  Verknüpfte Person
                </p>
              </div>
            </div>
            <div className="sce-detail-section-body">
              <p className="text-sm italic text-[var(--muted)]">
                Keine Person verknüpft.
              </p>
            </div>
          </div>

          {/* Reset Password */}
          <div className="sce-detail-section">
            <div className="sce-detail-section-header">
              <div className="flex items-center gap-2">
                <KeyRound className="h-4 w-4 text-[var(--muted)]" />
                <p className="text-xs font-semibold uppercase tracking-[0.1em] text-[var(--muted)]">
                  Passwort zurücksetzen
                </p>
              </div>
            </div>
            <div className="sce-detail-section-body">
              <ResetPasswordForm userId={user.id} />
            </div>
          </div>

          {/* System Information */}
          <div className="sce-detail-section">
            <div className="sce-detail-section-header">
              <div className="flex items-center gap-2">
                <Hash className="h-4 w-4 text-[var(--muted)]" />
                <p className="text-xs font-semibold uppercase tracking-[0.1em] text-[var(--muted)]">
                  Systemdaten
                </p>
              </div>
            </div>
            <div className="sce-detail-section-body space-y-4">
              <div className="sce-data-field">
                <span className="sce-data-label">Erstellt</span>
                <span className="sce-data-value">{formatDate(user.createdAt)}</span>
              </div>
              <div className="sce-data-field">
                <span className="sce-data-label">Zuletzt geändert</span>
                <span className="sce-data-value">{formatDate(user.updatedAt)}</span>
              </div>
              <div className="sce-data-field">
                <span className="sce-data-label">ID</span>
                <code className="font-mono text-[0.72rem] text-[var(--muted)]">
                  {user.id}
                </code>
              </div>
            </div>
          </div>
        </div>
      </div>
      </DetailPagePattern>
    </PageShell>
  );
}
