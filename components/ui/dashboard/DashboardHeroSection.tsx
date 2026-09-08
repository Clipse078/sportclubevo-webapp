"use client";

import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  useTransition,
} from "react";
import { ChevronDown, Crop, ImageIcon, Trash2, Upload } from "lucide-react";
import { cn } from "@/lib/cn";
import {
  DEFAULT_HERO_TRANSFORM,
  applyZoomAtAnchor,
  clampZoom,
  type HeroImageTransform,
  type Size2D,
} from "@/lib/dashboard/dashboard-hero-position";
import { DashboardHero } from "./DashboardHero";
import type { DashboardHeroProps } from "./DashboardHero";
import { DashboardHeroEditorToolbar } from "./DashboardHeroEditorToolbar";

const ACCEPTED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;
const STORAGE_UNAVAILABLE_MESSAGE = "Vorschau – noch nicht dauerhaft gespeichert";

type HeroImageState = {
  imageUrl: string | null;
  transform: HeroImageTransform;
};

type DashboardHeroSectionProps = Omit<
  DashboardHeroProps,
  | "backgroundImageUrl"
  | "backgroundTransform"
  | "isEditingBackground"
  | "onBackgroundTransformChange"
  | "editorOverlay"
  | "actions"
> & {
  initialBackgroundImageUrl?: string | null;
};

function isLocalPreviewUrl(url: string | null | undefined): url is string {
  return typeof url === "string" && url.startsWith("blob:");
}

function createHeroState(imageUrl: string | null): HeroImageState {
  return {
    imageUrl,
    transform: { ...DEFAULT_HERO_TRANSFORM },
  };
}

export function DashboardHeroSection({
  initialBackgroundImageUrl = null,
  ...heroProps
}: DashboardHeroSectionProps) {
  const [savedState, setSavedState] = useState<HeroImageState>(() =>
    createHeroState(initialBackgroundImageUrl),
  );
  const [draftState, setDraftState] = useState<HeroImageState | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [storageAvailable, setStorageAvailable] = useState<boolean | null>(null);
  const [isPending, startTransition] = useTransition();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const localPreviewUrlRef = useRef<string | null>(null);
  const editorMetricsRef = useRef<{ viewport: Size2D; image: Size2D } | null>(null);
  const fileInputId = useId();

  const displayState = isEditing && draftState ? draftState : savedState;

  const revokeLocalPreview = useCallback(() => {
    if (localPreviewUrlRef.current) {
      URL.revokeObjectURL(localPreviewUrlRef.current);
      localPreviewUrlRef.current = null;
    }
  }, []);

  const enterEditMode = useCallback((base: HeroImageState) => {
    setDraftState({
      imageUrl: base.imageUrl,
      transform: { ...base.transform },
    });
    setIsEditing(true);
    setMenuOpen(false);
    setFeedback(null);
  }, []);

  const exitEditMode = useCallback(() => {
    setDraftState(null);
    setIsEditing(false);
  }, []);

  const applyLocalPreview = useCallback(
    (file: File, openEditor = true) => {
      revokeLocalPreview();
      const previewUrl = URL.createObjectURL(file);
      localPreviewUrlRef.current = previewUrl;
      const nextState = createHeroState(previewUrl);
      if (openEditor) {
        setDraftState(nextState);
        setIsEditing(true);
        setFeedback(
          "Titelbild-Vorschau gesetzt. Position anpassen und speichern. Dauerhafte Speicherung folgt nach Schema-Freigabe.",
        );
      } else {
        setSavedState(nextState);
        setFeedback(
          "Titelbild-Vorschau gesetzt. Dauerhafte Speicherung folgt nach Schema-Freigabe.",
        );
      }
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

        if (payload.imageUrl && !savedState.imageUrl) {
          setSavedState(createHeroState(payload.imageUrl));
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

  const handleAdjustClick = useCallback(() => {
    if (!savedState.imageUrl) return;
    enterEditMode(savedState);
  }, [enterEditMode, savedState]);

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
          applyLocalPreview(file, true);
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
            applyLocalPreview(file, true);
            return;
          }

          if (!response.ok || !payload.imageUrl) {
            setFeedback(payload.error ?? "Titelbild konnte nicht hochgeladen werden.");
            return;
          }

          revokeLocalPreview();
          const nextState = createHeroState(payload.imageUrl);
          setDraftState(nextState);
          setIsEditing(true);
          setFeedback(
            payload.persistencePending
              ? "Titelbild hochgeladen. Position anpassen und speichern. Dauerhafte Speicherung folgt nach Schema-Freigabe."
              : "Titelbild hochgeladen. Position anpassen und speichern.",
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
    exitEditMode();

    if (isLocalPreviewUrl(savedState.imageUrl)) {
      revokeLocalPreview();
      setSavedState(createHeroState(null));
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
        setSavedState(createHeroState(null));
        setFeedback(payload.message ?? "Titelbild entfernt.");
      } catch {
        setFeedback("Titelbild konnte nicht entfernt werden.");
      }
    });
  }, [exitEditMode, revokeLocalPreview, savedState.imageUrl, startTransition]);

  const handleDraftTransformChange = useCallback((transform: HeroImageTransform) => {
    setDraftState((current) => (current ? { ...current, transform } : current));
  }, []);

  const handleZoomChange = useCallback((zoom: number) => {
    setDraftState((current) => {
      if (!current) return current;

      const metrics = editorMetricsRef.current;
      if (!metrics) {
        return {
          ...current,
          transform: { ...current.transform, zoom: clampZoom(zoom) },
        };
      }

      return {
        ...current,
        transform: applyZoomAtAnchor(metrics.viewport, metrics.image, current.transform, zoom),
      };
    });
  }, []);

  const handleBackgroundMetricsChange = useCallback(
    (metrics: { viewport: Size2D; image: Size2D } | null) => {
      editorMetricsRef.current = metrics;
    },
    [],
  );

  const handleReset = useCallback(() => {
    setDraftState((current) =>
      current
        ? {
            ...current,
            transform: { ...DEFAULT_HERO_TRANSFORM },
          }
        : current,
    );
  }, []);

  const handleCancelEdit = useCallback(() => {
    if (draftState?.imageUrl && isLocalPreviewUrl(draftState.imageUrl) && !savedState.imageUrl) {
      revokeLocalPreview();
    }
    exitEditMode();
    setFeedback(null);
  }, [draftState?.imageUrl, exitEditMode, revokeLocalPreview, savedState.imageUrl]);

  useEffect(() => {
    if (!isEditing) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      if (menuOpen) return;
      event.preventDefault();
      handleCancelEdit();
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [handleCancelEdit, isEditing, menuOpen]);

  const handleSaveEdit = useCallback(() => {
    if (!draftState) return;

    setSavedState({
      imageUrl: draftState.imageUrl,
      transform: { ...draftState.transform },
    });
    exitEditMode();
    setFeedback(
      storageAvailable === false
        ? "Titelbild für diese Sitzung gespeichert."
        : "Titelbild-Position gespeichert. Dauerhafte Speicherung der Position folgt nach Schema-Freigabe.",
    );
  }, [draftState, exitEditMode, storageAvailable]);

  const uploadLabel = displayState.imageUrl ? "Bild ersetzen" : "Bild hochladen";

  const heroActions = (
    <div
      className="relative flex flex-col items-start gap-1 sm:items-end"
      data-hero-interactive
    >
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
          disabled={isPending || isEditing}
          onClick={() => setMenuOpen((open) => !open)}
          className={cn(
            "inline-flex min-h-[2.75rem] items-center gap-1.5 rounded-[var(--radius-md)]",
            "border border-[color-mix(in_srgb,var(--border)_55%,transparent)]",
            "bg-[color-mix(in_srgb,var(--background)_72%,transparent)] px-3 py-2",
            "text-[0.75rem] font-medium text-[var(--foreground)] backdrop-blur-[2px]",
            "motion-safe:transition-colors motion-safe:duration-150",
            "hover:bg-[color-mix(in_srgb,var(--surface-2)_82%,transparent)]",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--sce-primary)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--background)]",
            (isPending || isEditing) && "cursor-not-allowed opacity-70",
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
            {savedState.imageUrl && (
              <button
                type="button"
                role="menuitem"
                disabled={isPending || isEditing}
                onClick={handleAdjustClick}
                className="flex min-h-[2.75rem] w-full items-center gap-2 px-3 py-2 text-left text-[0.8125rem] text-[var(--foreground)] hover:bg-[var(--surface-2)] focus-visible:bg-[var(--surface-2)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--sce-primary)]"
              >
                <Crop className="h-4 w-4 shrink-0 text-[var(--text-2)]" aria-hidden="true" />
                Titelbild anpassen
              </button>
            )}
            {savedState.imageUrl && (
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

      {storageAvailable === false && !feedback && !isEditing && (
        <p
          className="max-w-[16rem] text-[0.6875rem] leading-snug text-[var(--text-2)] sm:text-right"
          role="status"
        >
          {STORAGE_UNAVAILABLE_MESSAGE}
        </p>
      )}

      {feedback && !isEditing && (
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

  const editorOverlay =
    isEditing && draftState ? (
      <>
        <p
          className="pointer-events-none absolute left-4 top-3 z-30 max-w-[14rem] rounded-[var(--radius-sm)] bg-[color-mix(in_srgb,var(--surface)_88%,transparent)] px-2 py-1 text-[0.6875rem] leading-snug text-[var(--text-2)] backdrop-blur-sm"
          role="status"
        >
          Bild ziehen, um den Ausschnitt zu verschieben. Pfeiltasten für Feinjustierung.
        </p>
        <div data-hero-editor-control>
          <DashboardHeroEditorToolbar
            transform={draftState.transform}
            onZoomChange={handleZoomChange}
            onReset={handleReset}
            onCancel={handleCancelEdit}
            onSave={handleSaveEdit}
            isSaving={isPending}
          />
        </div>
      </>
    ) : null;

  return (
    <DashboardHero
      {...heroProps}
      backgroundImageUrl={displayState.imageUrl}
      backgroundTransform={displayState.transform}
      isEditingBackground={isEditing}
      onBackgroundTransformChange={isEditing ? handleDraftTransformChange : undefined}
      onBackgroundMetricsChange={handleBackgroundMetricsChange}
      editorOverlay={editorOverlay}
      actions={heroActions}
    />
  );
}
