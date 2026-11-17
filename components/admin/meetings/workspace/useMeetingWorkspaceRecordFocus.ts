"use client";

import { useContext, useEffect, useRef } from "react";
import { useSearchParams } from "next/navigation";
import {
  MEETING_FOCUS_ACTION_QUERY,
  MEETING_FOCUS_DECISION_QUERY,
} from "@/lib/meetings/meeting-traktandum-navigation";
import { MeetingWorkspaceSectionsContext } from "@/components/admin/meetings/workspace/MeetingWorkspaceSectionsContext";

export function useMeetingWorkspaceRecordFocus(recordId: string, kind: "decision" | "action") {
  const ref = useRef<HTMLDivElement>(null);
  const searchParams = useSearchParams();
  const sections = useContext(MeetingWorkspaceSectionsContext);

  useEffect(() => {
    const param = kind === "decision" ? MEETING_FOCUS_DECISION_QUERY : MEETING_FOCUS_ACTION_QUERY;
    const focusId = searchParams?.get(param);
    if (!focusId || focusId !== recordId) return;

    const section = kind === "decision" ? "beschluesse" : "pendenzen";
    sections?.navigateToSection(section, { skipScroll: true });

    const frame = window.requestAnimationFrame(() => {
      ref.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
    return () => window.cancelAnimationFrame(frame);
  }, [kind, recordId, searchParams, sections]);

  return ref;
}