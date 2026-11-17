"use client";

import Link from "next/link";
import type { MeetingOutcomeOrigin } from "@/lib/meetings/meeting-outcome-origin-types";

type Props = {
  origin: MeetingOutcomeOrigin | null | undefined;
  testId?: string;
};

export function MeetingOutcomeOriginLinks({ origin, testId }: Props) {
  if (!origin || origin.links.length === 0) return null;

  return (
    <div className="space-y-1" data-testid={testId}>
      <p className="text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">Entstanden in</p>
      <ul className="space-y-0.5 text-sm text-[var(--text-2)]">
        {origin.links.map((link, index) => (
          <li key={`${index}-${link.label}`}>
            {link.href && !link.restricted ? (
              <Link href={link.href} className="font-medium text-[#0b4aa2] hover:underline">
                {link.label}
              </Link>
            ) : (
              <span>{link.restricted ? "Eingeschränkter Bezug" : link.label}</span>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}