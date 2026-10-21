"use client";

import { useState } from "react";
import { Link2 } from "lucide-react";
import { Dialog } from "@/components/ui/Dialog";
import Link from "next/link";

type Props = {
  className?: string;
};

/** Primary create entry — team-season mapping workflow (not a generic /new form). */
export default function ProviderMappingCreateTrigger({ className }: Props) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        className={
          className ??
          "inline-flex items-center gap-2 rounded-lg bg-[var(--sce-primary)] px-4 py-2 text-sm font-semibold text-white"
        }
        data-sce-create-flow="modal"
        onClick={() => setOpen(true)}
      >
        <Link2 className="h-4 w-4" aria-hidden />
        Neue Zuordnung
      </button>
      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        title="Anbieter-Zuordnung erstellen"
        description="Zuordnungen werden pro TeamSeason im Mapping-Workflow erstellt — nicht über eine generische /new-Seite."
        size="standard"
      >
        <p className="text-sm text-[var(--text-2)]">
          Wählen Sie in der Liste eine Zeile ohne SCE-Team oder öffnen Sie das Team-Cockpit und starten
          Sie den Zuordnungsdialog für die gewünschte TeamSeason.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <Link href="/dashboard/teams" className="fca-button-primary" onClick={() => setOpen(false)}>
            Teams öffnen
          </Link>
          <button type="button" className="fca-button-secondary" onClick={() => setOpen(false)}>
            Schliessen
          </button>
        </div>
      </Dialog>
    </>
  );
}
