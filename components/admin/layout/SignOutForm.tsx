"use client";

import type { ReactNode } from "react";
import { signOutAction } from "@/app/actions/auth-actions";
import {
  getOrCreatePushInstallationId,
  unsubscribeLocalWebPushSubscription,
} from "@/lib/push/client/push-registration-client";

type SignOutFormProps = {
  children: ReactNode;
  className?: string;
};

export default function SignOutForm({ children, className }: SignOutFormProps) {
  async function handleSignOut() {
    const installationId = getOrCreatePushInstallationId();
    await unsubscribeLocalWebPushSubscription();
    await signOutAction(installationId);
    window.location.assign("/login");
  }

  return (
    <form action={handleSignOut} className={className}>
      {children}
    </form>
  );
}
