"use client";

import { Dialog } from "@/components/ui/Dialog";

type Props = {
  open: boolean;
  onClose: () => void;
  title: string;
  description: string;
  children: React.ReactNode;
};

export default function NativeBillingCreateComposerDialog({
  open,
  onClose,
  title,
  description,
  children,
}: Props) {
  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={title}
      description={description}
      size="workspace"
      bodyLayout="flex"
      footer={null}
    >
      <div className="min-h-0 flex-1 overflow-y-auto">{children}</div>
    </Dialog>
  );
}
