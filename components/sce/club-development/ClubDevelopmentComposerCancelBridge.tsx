"use client";

import type { ReactNode } from "react";

type Props = {
  onClose: () => void;
  children: (onCancel: () => void) => ReactNode;
};

/** Passes modal close target — forms apply {@link useGuardedComposerCancel} before invoking. */
export function ClubDevelopmentComposerCancelBridge({ onClose, children }: Props) {
  return <>{children(onClose)}</>;
}
