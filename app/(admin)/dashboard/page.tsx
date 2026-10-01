import { redirect } from "next/navigation";
import { auth } from "@/auth";
import ClubDashboardView from "@/components/admin/dashboard/ClubDashboardView";
import { resolveWorkspaceContextFromSessionUser } from "@/lib/workspace/workspace-context";
import {
  finishSceHotfixLogin01DashboardTrace,
  initSceHotfixLogin01DashboardTrace,
  logSceHotfixLogin01Step,
  logSceHotfixLogin01StepDone,
  sceHotfixLogin01TraceEnabled,
} from "@/lib/incident/sce-hotfix-login-01-trace";

type DashboardPageProps = {
  searchParams: Promise<{ monat?: string }>;
};

export default async function DashboardPage({ searchParams }: DashboardPageProps) {
  await initSceHotfixLogin01DashboardTrace();
  if (sceHotfixLogin01TraceEnabled()) {
    logSceHotfixLogin01Step("auth");
  }
  const session = await auth();
  if (sceHotfixLogin01TraceEnabled()) {
    logSceHotfixLogin01StepDone("auth");
  }
  const workspaceContext = resolveWorkspaceContextFromSessionUser(session?.user);

  if (workspaceContext === "platform") {
    redirect("/dashboard/platform");
  }

  const params = await searchParams;

  const view = <ClubDashboardView calendarMonthParam={params.monat ?? null} />;
  finishSceHotfixLogin01DashboardTrace();
  return view;
}
