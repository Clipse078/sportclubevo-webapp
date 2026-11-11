"use client";

import Link from "next/link";
import { Plus } from "lucide-react";

export default function CreateMeetingTrigger({ className }: { className?: string }) {
  return (
    <Link
      href="/vereinsleitung/meetings/new"
      className={className ?? "fca-button-primary inline-flex items-center gap-2"}
      data-sce-create-flow="page"
      data-testid="meeting-create-trigger"
    >
      <Plus className="h-4 w-4" aria-hidden />
      Neues Meeting
    </Link>
  );
}
