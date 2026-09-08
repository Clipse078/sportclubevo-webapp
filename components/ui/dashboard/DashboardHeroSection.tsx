"use client";

import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  useTransition,
} from "react";
import { ChevronDown, ImageIcon, Trash2, Upload } from "lucide-react";
import { cn } from "@/lib/cn";
import { DashboardHero } from "./DashboardHero";
import type { DashboardHeroProps } from "./DashboardHero";

const ACCEPTED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;
const STORAGE_UNAVAILABLE_MESSAGE =
  "Titelbild-Upload ist derzeit nicht verfügbar (Speicher nicht konfiguriert). Vorschau nur für diese Sitzung.";

type DashboardHeroSectionProps = Omit<DashboardHeroProps, "backgroundImageUrl" | "actions"> & {
  initialBackgroundImageUrl?: string | null;
};

function isLocalPreviewUrl(url: string | null | undefined): url is string {
  return typeof url === "string" && url.startsWith("blob:");
}

export function DashboardHeroSection({
  initialBackgroundImageUrl = null,
  ...heroProps
}: DashboardHeroSectionProps) {
  const [backgroundImageUrl, setBackgroundImageUrl] = useState<string | null>(
    initialBackgroundImageUrl,
  );
  const [menuOpen, setMenuOpen] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [storageAvailable, setStorageAvailable] = useState<boolean | null>(null);
  const [isPending, startTransition] = useTransition();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const localPreviewUrlRef = useRef<string | null>(null);
  const fileInputId = useId();

  const revokeLocalPreview = useCallback(() => {
    if (localPreviewUrlRef.current) {
      URL.revokeObjectURL(localPreviewUrlRef.current);
      localPreviewUrlRef.current = null;
    }
  }, []);

  const applyLocalPreview = useCallback(
    (file: File) => {
      revokeLocalPreview();
      const previewUrl = URL.createObjectURL(file);
      localPreviewUrlRef.current = previewUrl;
      setBackgroundImageUrl(previewUrl);
      setFeedback(
        "Titelbild-Vorschau gesetzt. Dauerhafte Speicherung folgt nach Schema-Freigabe.",
      );
    },
    [revokeLocalPreview],
  );

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      try {
        const response = await fetch("/api/account/dashboard-hero-image");
        if (!response.ok) return;

        const payload = (await response.json()) as {
          storageAvailable?: boolean;
          imageUrl?: string | null;
        };

        if (cancelled) return;

        setStorageAvailable(payload.storageAvailable ?? false);

        if (payload.imageUrl && !backgroundImageUrl) {
          setBackgroundImageUrl(payload.imageUrl);
        }
      } catch {
        if (!cancelled) {
          setStorageAvailable(null);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
    // Intentionally only on mount — initial server value may already be set.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    return () => {
      if (localPreviewUrlRef.current) {
        URL.revokeObjectURL(localPreviewUrlRef.current);
        localPreviewUrlRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (!menuOpen) return;

    const handlePointerDown = (event: MouseEvent) => {
      if (!menuRef.current?.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setMenuOpen(false);
      }
    };

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [menuOpen]);

  const handleUploadClick = useCallback(() => {
    setMenuOpen(false);
    fileInputRef.current?.click();
  }, []);

  const handleFileChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      event.target.value = "";
      if (!file) return;

      if (!ACCEPTED_IMAGE_TYPES.includes(file.type as (typeof ACCEPTED_IMAGE_TYPES)[number])) {
        setFeedback("Bitte JPEG, PNG oder WebP wählen.");
        return;
      }

      startTransition(async () => {
        setFeedback(null);

        let storageReady = storageAvailable;
        if (storageReady === null) {
          try {
            const statusResponse = await fetch("/api/account/dashboard-hero-image");
            if (statusResponse.ok) {
              const statusPayload = (await statusResponse.json()) as {
                storageAvailable?: boolean;
              };
              storageReady = statusPayload.storageAvailable ?? false;
              setStorageAvailable(storageReady);
            } else {
              storageReady = false;
              setStorageAvailable(false);
            }
          } catch {
            storageReady = false;
            setStorageAvailable(false);
          }
        }

        if (storageReady === false) {
          applyLocalPreview(file);
          return;
        }

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

          if (response.status === 503) {
            setStorageAvailable(false);
            applyLocalPreview(file);
            return;
          }

          if (!response.ok || !payload.imageUrl) {
            setFeedback(payload.error ?? "Titelbild konnte nicht hochgeladen werden.");
            return;
          }

          revokeLocalPreview();
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
    [applyLocalPreview, revokeLocalPreview, startTransition, storageAvailable],
  );

  const handleRemove = useCallback(() => {
    setMenuOpen(false);

    if (isLocalPreviewUrl(backgroundImageUrl)) {
      revokeLocalPreview();
      setBackgroundImageUrl(null);
      setFeedback("Titelbild entfernt.");
      return;
    }

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

        revokeLocalPreview();
        setBackgroundImageUrl(null);
        setFeedback(payload.message ?? "Titelbild entfernt.");
      } catch {
        setFeedback("Titelbild konnte nicht entfernt werden.");
      }
    });
  }, [backgroundImageUrl, revokeLocalPreview, startTransition]);

  const uploadLabel = backgroundImageUrl ? "Bild ersetzen" : "Bild hochladen";

  const heroActions = (
    <div className="relative flex flex-col items-start gap-1 sm:items-end">
      <input
        ref={fileInputRef}
        id={fileInputId}
        type="file"
        accept={ACCEPTED_IMAGE_TYPES.join(",")}
        className="sr-only"
        aria-label={uploadLabel}
        onChange={handleFileChange}
      />

      <div ref={menuRef} className="relative">
        <button
          type="button"
          aria-haspopup="menu"
          aria-expanded={menuOpen}
          aria-controls={`${fileInputId}-menu`}
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
            id={`${fileInputId}-menu`}
            role="menu"
            aria-label="Titelbild-Aktionen"
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
              className="flex min-h-[2.75rem] w-full items-center gap-2 px-3 py-2 text-left text-[0.8125rem] text-[var(--foreground)] hover:bg-[var(--surface-2)] focus-visible:bg-[var(--surface-2)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--sce-primary)]"
            >
              <Upload className="h-4 w-4 shrink-0 text-[var(--text-2)]" aria-hidden="true" />
              {uploadLabel}
            </button>
            {backgroundImageUrl && (
              <button
                type="button"
                role="menuitem"
                disabled={isPending}
                onClick={handleRemove}
                className="flex min-h-[2.75rem] w-full items-center gap-2 px-3 py-2 text-left text-[0.8125rem] text-[var(--foreground)] hover:bg-[var(--surface-2)] focus-visible:bg-[var(--surface-2)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--sce-primary)]"
              >
                <Trash2 className="h-4 w-4 shrink-0 text-[var(--sce-danger)]" aria-hidden="true" />
                Titelbild entfernen
              </button>
            )}
          </div>
        )}
      </div>

      {storageAvailable === false && !feedback && (
        <p
          className="max-w-[16rem] text-[0.6875rem] leading-snug text-[var(--text-2)] sm:text-right"
          role="status"
        >
          {STORAGE_UNAVAILABLE_MESSAGE}
        </p>
      )}

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
