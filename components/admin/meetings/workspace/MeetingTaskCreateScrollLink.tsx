"use client";

import { Plus } from "lucide-react";

type Props = {
  label: string;
};

export default function MeetingTaskCreateScrollLink({ label }: Props) {
  function openInlineEditor() {
    const target = document.getElementById("meeting-section-aufgaben");
    if (target) {
      target.scrollIntoView({ behavior: "smooth", block: "start" });
    }
    window.dispatchEvent(new CustomEvent("meeting-open-inline-task-create"));
  }

  return (
    <button
      type="button"
      className="fca-button-primary inline-flex items-center gap-1.5 text-sm"
      onClick={openInlineEditor}
      data-testid="meeting-header-task-scroll"
    >
      <Plus className="h-4 w-4" aria-hidden />
      {label}
    </button>
  );
}
