import type { CSSProperties, ReactNode } from "react";
import { cn } from "@/lib/cn";
import {
  SCE_AUTHENTICATED_APP_BACKGROUND_IMAGE,
  SCE_AUTHENTICATED_APP_BACKGROUND_POSITION,
} from "@/lib/shell/sce-app-background";

const PITCH_CANVAS_STYLE: CSSProperties = {
  backgroundColor: "var(--sce-app-background)",
  backgroundImage: SCE_AUTHENTICATED_APP_BACKGROUND_IMAGE,
  backgroundPosition: SCE_AUTHENTICATED_APP_BACKGROUND_POSITION,
  backgroundRepeat: "no-repeat",
  backgroundSize: "cover",
};

type Props = {
  children: ReactNode;
  className?: string;
  testId?: string;
};

/** Preview routes only — same football-pitch canvas as the authenticated SCE shell. */
export function ScePreviewPitchCanvas({ children, className, testId }: Props) {
  return (
    <div
      className={cn("min-h-screen w-full", className)}
      style={PITCH_CANVAS_STYLE}
      data-testid={testId}
    >
      {children}
    </div>
  );
}
