import { Replace } from "lucide-react";
import { cn } from "@/lib/cn";

type Props = {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  testId?: string;
  className?: string;
  ariaExpanded?: boolean;
  ariaControls?: string;
};

export default function PlanningEditorProgressiveChangeButton({
  label,
  onClick,
  disabled,
  testId = "planning-editor-progressive-change",
  className,
  ariaExpanded,
  ariaControls,
}: Props) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "fca-button-secondary inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs",
        className,
      )}
      data-testid={testId}
      aria-expanded={ariaExpanded}
      aria-controls={ariaControls}
    >
      <Replace className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
      {label}
    </button>
  );
}
