import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import type { ReactNode } from "react";
import StageEnvironmentBanner from "@/components/admin/deployment/StageEnvironmentBanner";
import AppShellNavigation from "@/components/admin/layout/AppShellNavigation";
import StopImpersonationButton from "@/components/admin/layout/StopImpersonationButton";
import { getActiveTenant } from "@/lib/tenants/active-tenant";
import { generateTenantCssVars } from "@/lib/tenant-runtime/theme";
import { getPersonProfileByUserIdCached } from "@/lib/server/request-cache";
import { resolveAccountIdentityName } from "@/lib/people/identity";
import { resolveWorkspaceContextFromSessionUser } from "@/lib/workspace/workspace-context";
import { SCE_AUTHENTICATED_APP_SHELL_CLASS } from "@/lib/shell/sce-app-background";
import { SCE_APP_SHELL_GLOBAL_NAV_CLASS } from "@/lib/shell/sce-app-shell-nav";
import { SCE_APP_MAIN_COLUMN } from "@/lib/shell/responsive-layout";
import "./authenticated-shell.css";
import "./global-app-navigation.css";
import { resolvePersonalParticipationNavCapability } from "@/lib/personal-actions/access";

type AdminLayoutProps = {
  children: ReactNode;
};

export default async function AdminLayout({ children }: AdminLayoutProps) {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  // RPERM-04: resolve tenant context through the single tenant-resolution helper
  // (session.user.activeTenantId, derived from TenantMembership — never the legacy
  // User.tenantId column). generateTenantCssVars() applies PLATFORM_BRANDING
  // defaults when null, so the layout is always safe even for platform-only
  // administrators with no active tenant.
  const [ctx, linkedPersonProfile] = await Promise.all([
    getActiveTenant(),
    getPersonProfileByUserIdCached(session.user.id),
  ]);

  const participationNavCapable = ctx?.id
    ? await resolvePersonalParticipationNavCapability({
        tenantId: ctx.id,
        userId: session.user.id,
      })
    : false;

  const tenantCssVars = generateTenantCssVars(ctx);

  // DASHBOARD-SHELL-UX-01-C2: the sidebar footer identity (directly above
  // "Abmelden") must render the authenticated human person's name, not the
  // raw User.firstName/lastName columns — for some bootstrapped tenant
  // accounts those hold the club name and role label instead (e.g. "FC
  // Allschwil" / "Club Admin"). Prefer the canonically linked Person's name
  // (Person.userId, ADMIN-MASTERDATA-UX-01), same relationship already used
  // for the dashboard greeting. See lib/people/identity.ts for the fallback
  // rule.
  const shellIdentity = resolveAccountIdentityName({
    linkedPerson: linkedPersonProfile,
    sessionFirstName: session.user.firstName,
    sessionLastName: session.user.lastName,
    tenantName: ctx?.name,
  });
  const shellImageUrl = linkedPersonProfile?.imageUrl ?? null;
  const workspaceContext = resolveWorkspaceContextFromSessionUser(session.user);

  return (
    <div
      className={`flex min-h-screen flex-col ${SCE_AUTHENTICATED_APP_SHELL_CLASS} ${SCE_APP_SHELL_GLOBAL_NAV_CLASS}`}
      style={tenantCssVars as React.CSSProperties}
      data-sce-modal-background
    >
      <Suspense fallback={null}>
        <AppShellNavigation
          permissionKeys={session.user.permissionKeys}
          workspaceContext={workspaceContext}
          clubName={ctx?.name}
          logoUrl={ctx?.logoUrl}
          navCapabilities={{
            personalActionsModule: participationNavCapable,
          }}
          firstName={shellIdentity.firstName}
          lastName={shellIdentity.lastName}
          email={session.user.email}
          imageUrl={shellImageUrl}
        />
      </Suspense>

      <div className={`${SCE_APP_MAIN_COLUMN} sce-app-main-with-mobile-nav`}>
        {/* Deployment environment banner */}
        <StageEnvironmentBanner />

        {/* Impersonation banner */}
        {session.user.isImpersonating ? (
          <div className="border-b border-[var(--sce-warning-border)] bg-[var(--sce-warning-light)] backdrop-blur-sm">
            <div className="px-5 py-3">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--sce-warning)]">
                    Impersonation aktiv
                  </p>
                  <p className="mt-0.5 text-xs text-[var(--text-2)]">
                    Eingeloggt als anderer Benutzer —{" "}
                    Admin: {session.user.actorName ?? session.user.actorEmail ?? "Unbekannt"}
                  </p>
                </div>
                <StopImpersonationButton />
              </div>
            </div>
          </div>
        ) : null}

        {/* Page content */}
        <main className="flex-1 px-5 py-6 lg:px-7 lg:py-7">
          {children}
        </main>
      </div>
    </div>
  );
}
