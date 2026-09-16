"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Archive, ArchiveRestore } from "lucide-react";
import { Button } from "@/components/ui";

type Resource = "club" | "team";

type ArchiveButtonProps = {
  resource: Resource;
  id: string;
  name: string;
  redirectTo?: string;
};

function endpointFor(resource: Resource, id: string): string {
  return resource === "club"
    ? `/api/club-directory/clubs/${id}`
    : `/api/club-directory/teams/${id}`;
}

export function ClubDirectoryArchiveButton({
  resource,
  id,
  name,
  redirectTo = "/dashboard/vereine",
}: ArchiveButtonProps) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleArchive() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(endpointFor(resource, id), { method: "DELETE" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data?.error ?? "Archivierung fehlgeschlagen.");
        setConfirming(false);
        return;
      }
      router.push(redirectTo);
      router.refresh();
    } catch {
      setError("Netzwerkfehler. Bitte erneut versuchen.");
      setConfirming(false);
    } finally {
      setLoading(false);
    }
  }

  const label = resource === "club" ? "Verein" : "Team";

  if (!confirming) {
    return (
      <div className="space-y-2" data-testid="club-archive-control">
        <p className="text-xs text-[var(--muted)]">
          Archivierung entfernt diesen {label.toLowerCase()} aus aktiven operativen Listen, ohne
          historische Referenzen zu löschen.
        </p>
        <Button
          type="button"
          variant="secondary"
          className="w-full border-[color-mix(in_srgb,var(--sce-danger)_35%,var(--border))] text-[var(--sce-danger)] hover:bg-[color-mix(in_srgb,var(--sce-danger)_8%,var(--surface-2))]"
          iconLeft={<Archive className="h-4 w-4" />}
          onClick={() => setConfirming(true)}
        >
          {label} archivieren
        </Button>
        {error ? <p className="text-center text-xs font-medium text-[var(--sce-danger)]">{error}</p> : null}
      </div>
    );
  }

  return (
    <div
      className="space-y-3 rounded-lg border border-[var(--border)] bg-[var(--surface-2)]/50 p-4"
      data-testid="club-archive-confirm"
    >
      <p className="text-sm font-semibold text-[var(--foreground)]">{`${name} wirklich archivieren?`}</p>
      <p className="text-xs text-[var(--muted)]">
        {resource === "club"
          ? "Verknüpfte Teams bleiben erhalten. Die Archivierung kann rückgängig gemacht werden."
          : "Die Archivierung kann rückgängig gemacht werden."}
      </p>
      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          variant="danger"
          loading={loading}
          className="flex-1"
          iconLeft={<Archive className="h-4 w-4" />}
          onClick={handleArchive}
        >
          Ja, archivieren
        </Button>
        <Button
          type="button"
          variant="secondary"
          className="flex-1"
          disabled={loading}
          onClick={() => {
            setConfirming(false);
            setError(null);
          }}
        >
          Abbrechen
        </Button>
      </div>
      {error ? <p className="text-xs font-medium text-[var(--sce-danger)]">{error}</p> : null}
    </div>
  );
}

type RestoreButtonProps = {
  resource: Resource;
  id: string;
  name: string;
  redirectToList?: boolean;
};

export function ClubDirectoryRestoreButton({
  resource,
  id,
  name,
  redirectToList = false,
}: RestoreButtonProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleRestore() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${endpointFor(resource, id)}/restore`, { method: "POST" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data?.error ?? "Wiederherstellung fehlgeschlagen.");
        return;
      }
      if (redirectToList) {
        router.push(resource === "club" ? "/dashboard/vereine" : "/dashboard/vereine");
      }
      router.refresh();
    } catch {
      setError("Netzwerkfehler. Bitte erneut versuchen.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-2">
      <Button
        type="button"
        variant="secondary"
        className="w-full"
        loading={loading}
        iconLeft={<ArchiveRestore className="h-4 w-4" />}
        onClick={handleRestore}
      >
        {`${name} wiederherstellen`}
      </Button>
      {error ? <p className="text-center text-xs font-medium text-[var(--sce-danger)]">{error}</p> : null}
    </div>
  );
}
