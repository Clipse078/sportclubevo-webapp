import { requireVereinsleitungWorkspaceAccess } from "@/lib/permissions/require-vereinsleitung-workspace-access";

export default async function VereinsleitungWorkspaceLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireVereinsleitungWorkspaceAccess();
  return children;
}
