"use client";

import { Dialog } from "@/components/ui/Dialog";
import NewsArticleForm from "@/components/admin/news/NewsArticleForm";

type Props = {
  open: boolean;
  onClose: () => void;
  requiresReview: boolean;
};

export default function NewsArticleCreateComposerDialog({
  open,
  onClose,
  requiresReview,
}: Props) {
  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Neue News"
      description="Newsartikel im Workspace-Composer anlegen. Fallback: /dashboard/website/news/new"
      size="workspace"
      bodyLayout="flex"
      footer={null}
    >
      <div className="min-h-0 flex-1 overflow-y-auto">
        <NewsArticleForm requiresReview={requiresReview} />
      </div>
    </Dialog>
  );
}
