"use client";

import type { ReactNode } from "react";
import { Dialog } from "@/components/ui/Dialog";
import {
  SceComposerDirtyCloseProvider,
  useOptionalSceComposerDirtyClose,
} from "@/components/sce/composer/SceComposerDirtyCloseContext";

type InnerProps = {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: ReactNode;
  testId?: string;
};

function SceClubDevelopmentComposerDialog({
  open,
  onClose,
  title,
  description,
  children,
  testId,
}: InnerProps) {
  const dirtyClose = useOptionalSceComposerDirtyClose();
  const guardedClose = () => {
    if (dirtyClose) {
      dirtyClose.requestClose(onClose);
      return;
    }
    onClose();
  };

  return (
    <Dialog
      open={open}
      onClose={guardedClose}
      title={title}
      description={description}
      size="workspace"
      bodyLayout="flex"
      footer={null}
    >
      <div
        className="min-h-0 flex-1 overflow-y-auto"
        data-sce-club-development-composer
        data-testid={testId}
      >
        {children}
      </div>
    </Dialog>
  );
}

export type SceClubDevelopmentComposerShellProps = InnerProps;

/**
 * Shared Club Development create/edit workspace modal (SCE-UX-01A).
 */
export function SceClubDevelopmentComposerShell(props: SceClubDevelopmentComposerShellProps) {
  return (
    <SceComposerDirtyCloseProvider>
      <SceClubDevelopmentComposerDialog {...props} />
    </SceComposerDirtyCloseProvider>
  );
}
