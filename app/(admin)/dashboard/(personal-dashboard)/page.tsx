import { redirect } from "next/navigation";
import { auth } from "@/auth";
import ClubDashboardView from "@/components/admin/dashboard/ClubDashboardView";
import { PageShell } from "@/components/ui/page";
import { SceWorkspaceChrome } from "@/components/sce/workspace/SceWorkspaceChrome";
import { resolveWorkspaceContextFromSessionUser } from "@/lib/workspace/workspace-context";
import {
  initSceHotfixLogin01DashboardTrace,
  runWithSceHotfixLogin01Trace,
  sceHotfixLogin01TraceEnabled,
} from "@/lib/incident/sce-hotfix-login-01-trace";

type DashboardPageProps = {
  searchParams?: Promise<{ monat?: string }>;
};

export default async function DashboardPage({
  searchParams = Promise.resolve({}),
}: DashboardPageProps = {}) {
  await initSceHotfixLogin01DashboardTrace();
  const session = await runWithSceHotfixLogin01Trace("auth", () => auth());
  const workspaceContext = resolveWorkspaceContextFromSessionUser(session?.user);

  if (workspaceContext === "platform") {
    redirect("/dashboard/platform");
  }

  const params = sceHotfixLogin01TraceEnabled()
    ? await runWithSceHotfixLogin01Trace("search-params", () => searchParams)
    : await searchParams;

  return (
    <PageShell fullWidth widthMode="dashboard">
      <SceWorkspaceChrome breadcrumbs={[{ label: "Dashboard" }]} density="dense">
        <ClubDashboardView
          authenticatedSession={session}
          calendarMonthParam={params.monat ?? null}
        />
      </SceWorkspaceChrome>
    </PageShell>
  );
}
