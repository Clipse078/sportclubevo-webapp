"use client";

import Link from "next/link";
import { CLUB_MELDUNG_STATUS_LABELS } from "@/lib/club-meldungen/copy";
import type { ClubMeldungStatus } from "@prisma/client";

export type ClubMeldungListItem = {
  id: string;
  caseNumber: string;
  subject: string;
  status: ClubMeldungStatus;
  urgent: boolean;
  followUpAt: string | null;
  lastActivityAt: string;
  orgUnit?: { id: string; name: string } | null;
  accountableUser?: { id: string; firstName: string; lastName: string } | null;
};

type Props = {
  tenantSlug: string;
  items: ClubMeldungListItem[];
  view: "mine" | "unassigned" | "all";
  baseHref: string;
  emptyLabel: string;
};

export default function ClubMeldungenWorkspace({
  tenantSlug,
  items,
  view,
  baseHref,
  emptyLabel,
}: Props) {
  const views: Array<{ key: Props["view"]; label: string; href: string }> = [
    { key: "mine", label: "Meine Zuständigkeiten", href: `${baseHref}?ansicht=mine` },
    { key: "unassigned", label: "Ohne Zuständigkeit", href: `${baseHref}?ansicht=unassigned` },
    { key: "all", label: "Alle Meldungen", href: `${baseHref}?ansicht=all` },
  ];

  return (
    <div className="flex flex-col gap-4">
      <nav className="flex flex-wrap gap-2" aria-label="Meldungsansichten">
        {views.map((tab) => (
          <Link
            key={tab.key}
            href={tab.href}
            className={`rounded-full border px-3 py-1 text-sm ${
              view === tab.key
                ? "border-slate-900 bg-slate-900 text-white"
                : "border-slate-200 text-slate-700 hover:bg-slate-50"
            }`}
          >
            {tab.label}
          </Link>
        ))}
      </nav>

      {items.length === 0 ? (
        <p className="rounded-md border border-dashed border-slate-200 bg-white px-4 py-8 text-center text-sm text-slate-600">
          {emptyLabel}
        </p>
      ) : (
        <ul className="divide-y divide-slate-100 rounded-md border border-slate-200 bg-white">
          {items.map((item) => (
            <li key={item.id}>
              <Link
                href={`/tenant/${tenantSlug}/cockpit/meldungen/${item.id}`}
                className="flex flex-col gap-1 px-4 py-3 hover:bg-slate-50 sm:flex-row sm:items-center sm:justify-between"
              >
                <div>
                  <span className="font-mono text-xs text-slate-500">{item.caseNumber}</span>
                  <p className="font-medium text-slate-900">{item.subject}</p>
                  <p className="text-xs text-slate-500">
                    {item.orgUnit?.name ?? "—"} ·{" "}
                    {item.accountableUser
                      ? `${item.accountableUser.firstName} ${item.accountableUser.lastName}`
                      : "Ohne Verantwortliche"}
                  </p>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  {item.urgent ? (
                    <span className="rounded bg-amber-50 px-2 py-0.5 text-xs text-amber-800">Dringend</span>
                  ) : null}
                  <span className="rounded bg-slate-100 px-2 py-0.5 text-xs text-slate-800">
                    {CLUB_MELDUNG_STATUS_LABELS[item.status]}
                  </span>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}