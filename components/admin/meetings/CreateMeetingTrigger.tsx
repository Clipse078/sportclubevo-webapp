"use client";

import { CreateMeetingListTrigger } from "./CreateMeetingInlineCollapsibleCard";

export const MEETINGS_INLINE_CREATE_EVENT = "vereinsleitung-meetings-expand-create";

export default function CreateMeetingTrigger({ className }: { className?: string }) {
  return (
    <CreateMeetingListTrigger
      className={className}
      onClick={() => {
        window.dispatchEvent(new CustomEvent(MEETINGS_INLINE_CREATE_EVENT));
      }}
    />
  );
}