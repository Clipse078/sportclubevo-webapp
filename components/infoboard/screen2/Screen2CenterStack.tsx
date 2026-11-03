"use client";

/**
 * components/infoboard/screen2/Screen2CenterStack.tsx
 *
 * SCE-INFOBOARD-V2-01-R21 — rotating full-screen Anlageplan and ÖV presentations.
 */

import type { CSSProperties, ReactElement, ReactNode } from "react";
import { useKioskTransport } from "@/components/infoboard/kiosk-transport";
import { Screen2PresentationRotator } from "@/components/infoboard/screen2/Screen2PresentationRotator";
import { Screen2TransportSlide } from "@/components/infoboard/screen2/Screen2TransportSlide";
import { SCREEN2_BODY_SHELL_CSS_VARS } from "@/lib/infoboard/screen2-body-shell-sizing";
import type { InfoboardDisplayTheme } from "@/lib/publishing/infoboard/display-theme";
import type { TransportResult } from "@/lib/transport/transport-types";
import styles from "./Screen2CenterStack.module.css";

export type Screen2CenterStackProps = {
  children: ReactNode;
  tenantKey: string;
  timezone: string;
  initialTransport: TransportResult | null;
  refreshIntervalSeconds: number;
  live?: boolean;
  theme?: InfoboardDisplayTheme;
};

export function Screen2CenterStack({
  children,
  tenantKey,
  timezone,
  initialTransport,
  refreshIntervalSeconds,
  live = true,
  theme = "DARK",
}: Screen2CenterStackProps): ReactElement {
  const transport = useKioskTransport(
    initialTransport,
    refreshIntervalSeconds,
    tenantKey,
    live,
  );

  return (
    <div
      className={styles.stack}
      data-testid="screen2-center-stack"
      data-theme={theme.toLowerCase()}
      style={SCREEN2_BODY_SHELL_CSS_VARS as CSSProperties}
    >
      <Screen2PresentationRotator
        sessionKey={tenantKey}
        autoRotate={live}
        anlageplan={<div className={styles.presentationRegion}>{children}</div>}
        ovAbfahrten={
          <div
            className={styles.presentationRegion}
            data-testid="screen2-transport-panel"
          >
            <Screen2TransportSlide
              transport={transport}
              timezone={timezone}
              theme={theme.toLowerCase() as "dark" | "light"}
            />
          </div>
        }
      />
    </div>
  );
}
