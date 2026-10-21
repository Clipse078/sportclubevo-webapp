"use client";

import { useRouter } from "next/navigation";
import { Dialog } from "@/components/ui/Dialog";
import WebsitePageForm from "@/components/admin/pages/WebsitePageForm";

type Props = {
  open: boolean;
  onClose: () => void;
  requiresReview: boolean;
};

export default function WebsitePageCreateComposerDialog({
  open,
  onClose,
  requiresReview,
}: Props) {
  const router = useRouter();

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Neue Seite"
      description="Website-Seite als Entwurf anlegen. Fallback: /dashboard/website/pages/new"
      size="workspace"
      bodyLayout="flex"
      footer={null}
    >
      <div className="min-h-0 flex-1 overflow-y-auto">
        <WebsitePageForm
          requiresReview={requiresReview}
          onCancel={onClose}
          onCreated={(pageId) => {
            onClose();
            router.push(`/dashboard/website/pages/${pageId}/edit`);
            router.refresh();
          }}
        />
      </div>
    </Dialog>
  );
}
