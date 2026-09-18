"use client";

import Link from "next/link";
import { CalendarDays, MoreHorizontal, Pencil } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { PopoverContent } from "@/components/ui/Popover";
import { cn } from "@/lib/cn";

type Props = {
  tournamentId: string;
  editHref: string;
  wochenplanerHref: string;
  canManage: boolean;
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

export default function TurniereRowContextMenu({
  tournamentId,
  editHref,
  wochenplanerHref,
  canManage,
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

  if (!canManage) {
    return (
      <Link
        href={editHref}
        className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-[var(--text-2)] hover:bg-[var(--surface-2)]"
        aria-label="Turnier öffnen"
        data-testid={`turniere-row-open-${tournamentId}`}
      >
        <Pencil className="h-4 w-4" />
      </Link>
    );
  }

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="Turnieraktionen"
        data-testid={`turniere-row-menu-${tournamentId}`}
        onClick={(event) => {
          event.preventDefault();
          event.stopPropagation();
          setOpen((value) => !value);
        }}
        className={cn(
          "relative z-[1] inline-flex h-8 w-8 items-center justify-center rounded-lg border border-transparent text-[var(--text-2)] transition-colors",
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
        clipOverflow={false}
        maxHeight={320}
        className="z-[60] w-[min(100vw-2rem,14rem)] rounded-xl border border-[var(--border-strong)] bg-[var(--surface)] p-1 shadow-[var(--shadow-lg)]"
        role="dialog"
      >
        <MenuItem
          icon={<Pencil className="h-4 w-4" />}
          iconClassName="text-sky-400"
          label="Turnier bearbeiten"
          href={editHref}
          onSelect={() => setOpen(false)}
        />
        <MenuItem
          icon={<CalendarDays className="h-4 w-4" />}
          iconClassName="text-violet-400"
          label="Im Wochenplaner anzeigen"
          href={wochenplanerHref}
          onSelect={() => setOpen(false)}
        />
      </PopoverContent>
    </>
  );
}
