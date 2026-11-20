import { SCE_CD_EMPTY_STATE_CLASS } from "./sce-club-development-surface-styles";

import type { ReactNode } from "react";

type Props = {
  message: string;
  testId?: string;
  action?: ReactNode;
};

export default function SceClubDevelopmentEmptyState({ message, testId, action }: Props) {
  return (
    <div className={SCE_CD_EMPTY_STATE_CLASS} data-testid={testId}>
      <p>{message}</p>
      {action ? <div className="mt-2">{action}</div> : null}
    </div>
  );
}