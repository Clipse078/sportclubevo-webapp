import { Building2 } from "lucide-react";
import { EmptyState } from "@/components/ui/page/EmptyState";

export default function PersonBereicheEmptyState() {
  return (
    <div data-testid="person-bereiche-empty-state">
      <EmptyState
        icon={<Building2 className="h-8 w-8" />}
        heading="Keine Bereiche zugewiesen"
        description="Diese Person hat derzeit keine zusätzlichen Zuständigkeiten für einzelne Teams oder organisatorische Bereiche."
        className="rounded-[var(--radius-lg)] border border-dashed border-[var(--border)] bg-[var(--surface-2)]/40 py-10"
      />
    </div>
  );
}
