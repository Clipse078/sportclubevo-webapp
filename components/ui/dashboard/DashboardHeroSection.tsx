"use client";

import { useCallback, useRef, useState, useTransition } from "react";
import { ChevronDown, ImageIcon, Trash2, Upload } from "lucide-react";
import { cn } from "@/lib/cn";
import { DashboardHero } from "./DashboardHero";
import type { DashboardHeroProps } from "./DashboardHero";

type DashboardHeroSectionProps = Omit<DashboardHeroProps, "backgroundImageUrl" | "actions"> & {
  initialBackgroundImageUrl?: string | null;
};

export function DashboardHeroSection({
  initialBackgroundImageUrl = null,
  ...heroProps
}: DashboardHeroSectionProps) {
  const [backgroundImageUrl, setBackgroundImageUrl] = useState<string | null>(
    initialBackgroundImageUrl,
  );
  const [menuOpen, setMenuOpen] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleUploadClick = useCallback(() => {
    setMenuOpen(false);
    fileInputRef.current?.click();
  }, []);

  const handleFileChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      event.target.value = "";
      if (!file) return;

      startTransition(async () => {
        setFeedback(null);
        const formData = new FormData();
        formData.append("file", file);

        try {
          const response = await fetch("/api/account/dashboard-hero-image", {
            method: "POST",
            body: formData,
          });
          const payload = (await response.json()) as {
            imageUrl?: string;
            error?: string;
            persistencePending?: boolean;
          };

          if (!response.ok || !payload.imageUrl) {
            setFeedback(payload.error ?? "Titelbild konnte nicht hochgeladen werden.");
            return;
          }

          setBackgroundImageUrl(payload.imageUrl);
          setFeedback(
            payload.persistencePending
              ? "Titelbild gesetzt. Dauerhafte Speicherung folgt nach Schema-Freigabe."
              : "Titelbild aktualisiert.",
          );
        } catch {
          setFeedback("Titelbild konnte nicht hochgeladen werden.");
        }
      });
    },
    [startTransition],
  );

  const handleRemove = useCallback(() => {
    setMenuOpen(false);
    startTransition(async () => {
      setFeedback(null);

      try {
        const response = await fetch("/api/account/dashboard-hero-image", {
          method: "DELETE",
        });
        const payload = (await response.json()) as { error?: string; message?: string };

        if (!response.ok) {
          setFeedback(payload.error ?? "Titelbild konnte nicht entfernt werden.");
          return;
        }

        setBackgroundImageUrl(null);
        setFeedback(payload.message ?? "Titelbild entfernt.");
      } catch {
        setFeedback("Titelbild konnte nicht entfernt werden.");
      }
    });
  }, [startTransition]);

  const heroActions = (
    <div className="relative flex flex-col items-start gap-1 sm:items-end">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="sr-only"
        aria-hidden
        tabIndex={-1}
        onChange={handleFileChange}
      />

      <div className="relative">
        <button
          type="button"
          aria-haspopup="menu"
          aria-expanded={menuOpen}
          aria-label="Titelbild ändern"
          disabled={isPending}
          onClick={() => setMenuOpen((open) => !open)}
          className={cn(
            "inline-flex min-h-[2.75rem] items-center gap-1.5 rounded-[var(--radius-md)]",
            "border border-[color-mix(in_srgb,var(--border)_55%,transparent)]",
            "bg-[color-mix(in_srgb,var(--background)_72%,transparent)] px-3 py-2",
            "text-[0.75rem] font-medium text-[var(--foreground)] backdrop-blur-[2px]",
            "motion-safe:transition-colors motion-safe:duration-150",
            "hover:bg-[color-mix(in_srgb,var(--surface-2)_82%,transparent)]",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--sce-primary)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--background)]",
            isPending && "cursor-wait opacity-70",
          )}
        >
          <ImageIcon className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          Titelbild ändern
          <ChevronDown
            className={cn(
              "h-3.5 w-3.5 shrink-0 motion-safe:transition-transform motion-safe:duration-150",
              menuOpen && "rotate-180",
            )}
            aria-hidden="true"
          />
        </button>

        {menuOpen && (
          <div
            role="menu"
            className={cn(
              "absolute right-0 z-20 mt-1.5 min-w-[11.5rem] overflow-hidden rounded-[var(--radius-md)]",
              "border border-[color-mix(in_srgb,var(--border)_70%,transparent)]",
              "bg-[var(--surface)] shadow-[var(--shadow-md)]",
            )}
          >
            <button
              type="button"
              role="menuitem"
              disabled={isPending}
              onClick={handleUploadClick}
              className="flex min-h-[2.75rem] w-full items-center gap-2 px-3 py-2 text-left text-[0.8125rem] text-[var(--foreground)] hover:bg-[var(--surface-2)] focus-visible:bg-[var(--surface-2)] focus-visible:outline-none"
            >
              <Upload className="h-4 w-4 shrink-0 text-[var(--text-2)]" aria-hidden="true" />
              Bild hochladen
            </button>
            {backgroundImageUrl && (
              <button
                type="button"
                role="menuitem"
                disabled={isPending}
                onClick={handleRemove}
                className="flex min-h-[2.75rem] w-full items-center gap-2 px-3 py-2 text-left text-[0.8125rem] text-[var(--foreground)] hover:bg-[var(--surface-2)] focus-visible:bg-[var(--surface-2)] focus-visible:outline-none"
              >
                <Trash2 className="h-4 w-4 shrink-0 text-[var(--sce-danger)]" aria-hidden="true" />
                Titelbild entfernen
              </button>
            )}
          </div>
        )}
      </div>

      {feedback && (
        <p
          className="max-w-[16rem] text-[0.6875rem] leading-snug text-[var(--text-2)] sm:text-right"
          role="status"
          aria-live="polite"
        >
          {feedback}
        </p>
      )}
    </div>
  );

  return (
    <DashboardHero
      {...heroProps}
      backgroundImageUrl={backgroundImageUrl}
      actions={heroActions}
    />
  );
}
