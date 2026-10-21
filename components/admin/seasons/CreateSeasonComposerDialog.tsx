"use client";

import { Plus } from "lucide-react";
import { Dialog } from "@/components/ui/Dialog";
import { createSeasonAction } from "@/app/(admin)/dashboard/seasons/actions";

type Props = {
  open: boolean;
  onClose: () => void;
  suggestedStartYear: number | null;
};

export default function CreateSeasonComposerDialog({
  open,
  onClose,
  suggestedStartYear,
}: Props) {
  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Neue Saison"
      description="Erstellt die Saison „Startjahr/Startjahr+1“ (z. B. 2026 → 2026/2027)."
      size="md"
      footer={null}
    >
      <form
        id="create-season-composer"
        action={createSeasonAction}
        className="space-y-4"
        onSubmit={() => onClose()}
      >
        <div>
          <label htmlFor="composer-startYear" className="mb-1 block text-xs font-medium text-[var(--muted)]">
            Startjahr
          </label>
          <input
            id="composer-startYear"
            name="startYear"
            type="number"
            required
            step={1}
            defaultValue={suggestedStartYear ?? undefined}
            placeholder="z. B. 2026"
            className="fca-input w-full max-w-xs"
          />
        </div>
        <p className="text-xs text-[var(--muted)]">
          Bereits vorhandene spätere oder frühere Saisons verhindern das nicht.
        </p>
        <div className="flex justify-end gap-2">
          <button type="button" className="fca-button-secondary" onClick={onClose}>
            Abbrechen
          </button>
          <button type="submit" className="fca-button-primary inline-flex items-center gap-2">
            <Plus className="h-4 w-4" aria-hidden />
            Saison erstellen
          </button>
        </div>
      </form>
    </Dialog>
  );
}
