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
import { revokeAllPushDevicesForUser } from "@/lib/push/push-device-registration-service";

export async function signOutAction() {
  const session = await auth();
  if (session?.user?.id) {
    await revokeAllPushDevicesForUser(session.user.id);
  }
  await signOut({ redirect: false, redirectTo: "/login" });
}
