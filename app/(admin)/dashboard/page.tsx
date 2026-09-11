import { redirect } from "next/navigation";
import { auth } from "@/auth";
import ClubDashboardView from "@/components/admin/dashboard/ClubDashboardView";
import { resolveWorkspaceContextFromSessionUser } from "@/lib/workspace/workspace-context";

export default async function DashboardPage() {
  const session = await auth();
  const workspaceContext = resolveWorkspaceContextFromSessionUser(session?.user);

  if (workspaceContext === "platform") {
    redirect("/dashboard/platform");
  }

  return <ClubDashboardView />;
}
