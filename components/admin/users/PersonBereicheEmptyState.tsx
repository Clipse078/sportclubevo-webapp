import { Building2 } from "lucide-react";
import { EmptyState } from "@/components/ui/page/EmptyState";

type Props = {
  pendingInvitation?: boolean;
};

export default function PersonBereicheEmptyState({ pendingInvitation = false }: Props) {
  return (
    <div data-testid="person-bereiche-empty-state">
      <EmptyState
        icon={<Building2 className="h-8 w-8" />}
        heading="Keine Bereiche zugewiesen"
        description={
          pendingInvitation
            ? "Für die Einladung wurden keine zusätzlichen bereichsbezogenen Zuständigkeiten hinterlegt. Clubweite Rollen und der geplante Zugriff finden sich unter Rollen & Funktionen bzw. Zugriff."
            : "Diese Person hat derzeit keine zusätzlichen Zuständigkeiten für einzelne Teams oder organisatorische Bereiche."
        }
        className="rounded-[var(--radius-lg)] border border-dashed border-[var(--border)] bg-[var(--surface-2)]/40 py-10"
      />
    </div>
  );
}
