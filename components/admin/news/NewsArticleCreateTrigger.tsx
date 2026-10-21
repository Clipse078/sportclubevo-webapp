"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import NewsArticleCreateComposerDialog from "@/components/admin/news/NewsArticleCreateComposerDialog";

type Props = {
  requiresReview: boolean;
  className?: string;
};

export default function NewsArticleCreateTrigger({ requiresReview, className }: Props) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        className={className ?? "fca-button-primary inline-flex items-center gap-2"}
        data-sce-create-flow="modal"
        onClick={() => setOpen(true)}
      >
        <Plus className="h-4 w-4" aria-hidden />
        Neue News erstellen
      </button>
      <NewsArticleCreateComposerDialog
        open={open}
        onClose={() => setOpen(false)}
        requiresReview={requiresReview}
      />
    </>
  );
}
