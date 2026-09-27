"use server";

/**
 * Server action for signing out.
 *
 * Invalidates the JWT session cookie via Auth.js signOut with redirect disabled,
 * so navigation can be completed by the client with a hard same-origin load of
 * /login. This avoids soft RSC transitions that can leave stale authenticated
 * shell UI in place after logout.
 */
import { auth, signOut } from "@/auth";
import { revokePushDeviceForInstallation } from "@/lib/push/push-device-registration-service";

export async function signOutAction(installationId?: string | null) {
  const session = await auth();
  const trimmedInstallationId = installationId?.trim();
  if (session?.user?.id && trimmedInstallationId) {
    await revokePushDeviceForInstallation({
      userId: session.user.id,
      installationId: trimmedInstallationId,
    });
  }
  await signOut({ redirect: false, redirectTo: "/login" });
}
