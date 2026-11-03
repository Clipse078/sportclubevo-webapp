/**
 * components/infoboard/screen2/Screen2BodyShell.tsx
 *
 * SCE-INFOBOARD-V2-01-R21 — full-width Screen 2 body shell.
 * Header and footer remain outside this shell.
 */

import type { ReactElement, ReactNode, CSSProperties } from "react";
import { SCREEN2_BODY_SHELL_CSS_VARS } from "@/lib/infoboard/screen2-body-shell-sizing";
import styles from "./Screen2BodyShell.module.css";

export type Screen2BodyShellProps = {
  center: ReactNode;
};

export function Screen2BodyShell({ center }: Screen2BodyShellProps): ReactElement {
  return (
    <div
      className={styles.shell}
      data-testid="screen2-body-shell"
      style={SCREEN2_BODY_SHELL_CSS_VARS as CSSProperties}
    >
      <div className={styles.center} data-testid="screen2-center-content">
        {center}
      </div>
    </div>
  );
}
