"use client";

import { Plus } from "lucide-react";

type Props = {
  label: string;
};

export default function MeetingTaskCreateScrollLink({ label }: Props) {
  function openTaskCreateDialog() {
    window.dispatchEvent(
      new CustomEvent("meeting-workspace-navigate-tab", { detail: { tab: "massnahmen" } }),
    );
    window.dispatchEvent(new CustomEvent("meeting-open-task-create-dialog"));
  }

  return (
    <button
      type="button"
      className="fca-button-primary inline-flex items-center gap-1.5 text-sm"
      onClick={openTaskCreateDialog}
      data-testid="meeting-header-task-scroll"
    >
      <Plus className="h-4 w-4" aria-hidden />
      {label}
    </button>
  );
}
