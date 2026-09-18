"use client";

import Link from "next/link";
import { CalendarDays, MoreHorizontal, Pencil } from "lucide-react";
import { SoccerPitchLineIcon } from "@/components/admin/shared/planning/FacilityResourceIdentity";
import { useEffect, useRef, useState } from "react";
import { PopoverContent } from "@/components/ui/Popover";
import { cn } from "@/lib/cn";

type Props = {
  matchId: string;
  detailHref: string;
  wochenplanerHref: string;
  canManage: boolean;
  showResultAction?: boolean;
};

function MenuItem({
  icon,
  iconClassName,
  label,
  href,
  onSelect,
}: {
  icon: React.ReactNode;
  iconClassName?: string;
  label: string;
  href: string;
  onSelect?: () => void;
}) {
  return (
    <Link
      href={href}
      role="menuitem"
      onClick={onSelect}
      className={cn(
        "flex w-full min-h-[40px] items-center gap-3 rounded-[0.625rem] px-3 py-2 text-left text-[0.8125rem] font-medium transition-colors",
        "text-[var(--foreground)] hover:bg-[var(--surface-2)]/90",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--sce-primary)] focus-visible:ring-offset-0",
      )}
    >
      <span
        className={cn(
          "inline-flex h-4 w-4 shrink-0 items-center justify-center",
          iconClassName,
        )}
        aria-hidden="true"
      >
        {icon}
      </span>
      <span className="min-w-0 flex-1 truncate">{label}</span>
    </Link>
  );
}

export default function SpieleMatchRowContextMenu({
  matchId,
  detailHref,
  wochenplanerHref,
  canManage,
  showResultAction = false,
}: Props) {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open]);

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="Spielaktionen"
        data-testid={`spiele-row-menu-${matchId}`}
        onClick={(event) => {
          event.preventDefault();
          event.stopPropagation();
          setOpen((value) => !value);
        }}
        className={cn(
          "inline-flex h-8 w-8 items-center justify-center rounded-lg border border-transparent text-[var(--text-2)] transition-colors",
          "hover:border-[var(--border)] hover:bg-[var(--surface-2)] hover:text-[var(--foreground)]",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--sce-primary)]",
        )}
      >
        <MoreHorizontal className="h-4 w-4" aria-hidden="true" />
      </button>

      <PopoverContent
        open={open}
        onOpenChange={setOpen}
        anchorRef={triggerRef}
        placement="bottom-end"
        matchAnchorWidth={false}
        role="dialog"
        className="w-[min(100vw-2rem,15rem)] p-1.5"
      >
        <MenuItem
          icon={<Pencil className="h-4 w-4" />}
          iconClassName="text-[var(--blue)]"
          label="Spiel bearbeiten"
          href={detailHref}
          onSelect={() => setOpen(false)}
        />
        {canManage ? (
          <MenuItem
            icon={<SoccerPitchLineIcon className="h-4 w-4" />}
            iconClassName="text-emerald-600"
            label="Ressourcen verwalten"
            href={detailHref}
            onSelect={() => setOpen(false)}
          />
        ) : null}
        <MenuItem
          icon={<CalendarDays className="h-4 w-4" />}
          iconClassName="text-[var(--sce-primary)]"
          label="Im Wochenplaner anzeigen"
          href={wochenplanerHref}
          onSelect={() => setOpen(false)}
        />
        {showResultAction ? (
          <MenuItem
            icon={<Pencil className="h-4 w-4" />}
            iconClassName="text-[var(--text-2)]"
            label="Resultat anzeigen"
            href={detailHref}
            onSelect={() => setOpen(false)}
          />
        ) : null}
      </PopoverContent>
    </>
  );
}
