import { redirect } from "next/navigation";
import { auth } from "@/auth";
import ClubDashboardView from "@/components/admin/dashboard/ClubDashboardView";
import { resolveWorkspaceContextFromSessionUser } from "@/lib/workspace/workspace-context";

type DashboardPageProps = {
  searchParams: Promise<{ monat?: string }>;
};

export default async function DashboardPage({ searchParams }: DashboardPageProps) {
  const session = await auth();
  const workspaceContext = resolveWorkspaceContextFromSessionUser(session?.user);

  if (workspaceContext === "platform") {
    redirect("/dashboard/platform");
  }

  const params = await searchParams;

  return <ClubDashboardView calendarMonthParam={params.monat ?? null} />;
}
