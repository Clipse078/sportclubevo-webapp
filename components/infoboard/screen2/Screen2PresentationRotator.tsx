"use client";

import type { ReactElement, ReactNode } from "react";
import {
  useScreen2PresentationRotation,
  type UseScreen2PresentationRotationOptions,
} from "./useScreen2PresentationRotation";
import styles from "./Screen2PresentationRotator.module.css";

export type Screen2PresentationRotatorProps = UseScreen2PresentationRotationOptions & {
  anlageplan: ReactNode;
  ovAbfahrten: ReactNode;
};

export function Screen2PresentationRotator({
  anlageplan,
  ovAbfahrten,
  autoRotate = true,
  sessionKey = "stable",
}: Screen2PresentationRotatorProps): ReactElement {
  const { presentation } = useScreen2PresentationRotation({ autoRotate, sessionKey });
  const showAnlageplan = presentation === "anlageplan";

  return (
    <div
      className={styles.rotator}
      data-testid="screen2-center-rotator"
      data-active-presentation={presentation}
    >
      <div
        className={styles.panel}
        data-testid="screen2-presentation-anlageplan"
        data-active={showAnlageplan ? "true" : "false"}
        aria-hidden={showAnlageplan ? undefined : true}
      >
        {anlageplan}
      </div>
      <div
        className={styles.panel}
        data-testid="screen2-presentation-ov"
        data-active={showAnlageplan ? "false" : "true"}
        aria-hidden={showAnlageplan ? true : undefined}
      >
        {ovAbfahrten}
      </div>
    </div>
  );
}
