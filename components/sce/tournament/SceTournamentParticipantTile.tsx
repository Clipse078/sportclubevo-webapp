"use client";

import { useState, type ReactNode, type RefObject } from "react";
import { Plus, Trash2 } from "lucide-react";
import { cn } from "@/lib/cn";
import { ClubCrest, type ClubCrestVisualSize } from "@/components/sporting-activity/ClubCrest";
import type { TournamentLobbyGridDensity } from "@/lib/tournaments/tournament-participant-presentation";
import type { TournamentLobbyParticipantIdentity } from "@/lib/tournaments/tournament-participant-presentation";

function crestDensityForLobby(density: TournamentLobbyGridDensity): ClubCrestVisualSize {
  if (density === "spacious") return "detail";
  if (density === "balanced") return "planner";
  return "management";
}

export type SceTournamentParticipantTileProps =
  | {
      variant: "participant";
      model: TournamentLobbyParticipantIdentity;
      density: TournamentLobbyGridDensity;
      onRemove?: (localId: string) => void;
      readOnly?: boolean;
      footer?: ReactNode;
      testId?: string;
    }
  | {
      variant: "add";
      density: TournamentLobbyGridDensity;
      onActivate: () => void;
      disabled?: boolean;
      triggerRef?: RefObject<HTMLButtonElement | null>;
      testId?: string;
    };

export function SceTournamentParticipantTile(props: SceTournamentParticipantTileProps) {
  const density = props.density;
  const tilePadding =
    density === "spacious" ? "p-3 min-h-[8rem]" : density === "balanced" ? "p-2.5 min-h-[7rem]" : "p-2 min-h-[6.5rem]";

  if (props.variant === "add") {
    return (
      <button
        ref={props.triggerRef}
        type="button"
        onClick={props.onActivate}
        disabled={props.disabled}
        data-testid={props.testId ?? "tournament-participant-add-tile"}
        className={cn(
          "group flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-[var(--border-strong)]",
          "bg-[var(--surface-2)]/40 text-[var(--text-2)] transition-colors",
          "hover:border-[var(--sce-accent)] hover:bg-[var(--surface-2)]/70 hover:text-[var(--foreground)]",
          "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--sce-focus-ring)]",
          tilePadding,
        )}
      >
        <span
          className={cn(
            "inline-flex items-center justify-center rounded-lg border border-[var(--border)] bg-[var(--surface-1)]",
            density === "spacious" ? "h-11 w-11" : density === "balanced" ? "h-10 w-10" : "h-9 w-9",
          )}
        >
          <Plus className={density === "dense" ? "h-5 w-5" : "h-6 w-6"} aria-hidden />
        </span>
        <span className="text-center text-sm font-semibold text-[var(--foreground)]">Teilnehmer hinzufügen</span>
      </button>
    );
  }

  const { model, onRemove, readOnly = false, footer } = props;
  const [confirmRemove, setConfirmRemove] = useState(false);
  const crestSize = crestDensityForLobby(density);
  const titleClass =
    density === "spacious" ? "text-base font-semibold" : density === "balanced" ? "text-sm font-semibold" : "text-sm font-medium";
  const designationClass =
    density === "dense" ? "text-xs font-semibold text-[var(--foreground)]" : "text-sm font-semibold text-[var(--foreground)]";

  return (
    <article
      className={cn(
        "relative flex flex-col items-center rounded-xl border border-[var(--border)] bg-[var(--surface-1)] text-center shadow-sm",
        tilePadding,
      )}
      data-testid={props.testId ?? `tournament-participant-tile-${model.localId}`}
      aria-label={model.accessibleLabel}
    >
      <div className="mb-1 flex flex-col items-center justify-center gap-1.5">
        <ClubCrest identity={model.identity} density={crestSize} decorative className="mx-auto" />
        <div className="space-y-0.5 px-1">
          <p className={cn(titleClass, "leading-tight text-[var(--foreground)]")}>{model.clubLine}</p>
          {model.designationLine && model.designationLine !== model.clubLine ? (
            <p className={designationClass}>{model.designationLine}</p>
          ) : null}
          {model.kindBadge ? (
            <p className="text-[0.625rem] font-bold uppercase tracking-wide text-[var(--sce-accent)]">
              {model.kindBadge}
            </p>
          ) : null}
        </div>
      </div>
      {footer ? <div className="mt-2 w-full text-left">{footer}</div> : null}
      {!readOnly && onRemove ? (
      <div className="mt-auto flex w-full justify-end pt-1">
        <button
          type="button"
          className={cn(
            "inline-flex h-8 min-w-[2rem] items-center justify-center rounded-md px-2 text-xs",
            confirmRemove
              ? "bg-[var(--sce-danger-soft)] text-[var(--sce-danger)]"
              : "text-[var(--muted)] hover:bg-[var(--surface-2)] hover:text-[var(--foreground)]",
            "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--sce-focus-ring)]",
          )}
          aria-label={
            confirmRemove
              ? `${model.accessibleLabel} endgültig entfernen`
              : `${model.accessibleLabel} entfernen`
          }
          onClick={() => {
            if (!confirmRemove) {
              setConfirmRemove(true);
              return;
            }
            onRemove(model.localId);
          }}
          onBlur={() => setConfirmRemove(false)}
          data-testid={`tournament-participant-remove-${model.localId}`}
        >
          {confirmRemove ? (
            "Entfernen?"
          ) : (
            <>
              <Trash2 className="h-4 w-4" aria-hidden />
              <span className="sr-only">Entfernen</span>
            </>
          )}
        </button>
      </div>
      ) : null}
    </article>
  );
}
