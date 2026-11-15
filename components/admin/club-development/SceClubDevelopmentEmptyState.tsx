import { SCE_CD_EMPTY_STATE_CLASS } from "./sce-club-development-surface-styles";

type Props = {
  message: string;
  testId?: string;
};

export default function SceClubDevelopmentEmptyState({ message, testId }: Props) {
  return (
    <div className={SCE_CD_EMPTY_STATE_CLASS} data-testid={testId}>
      {message}
    </div>
  );
}