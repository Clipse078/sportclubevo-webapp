/**
 * FIN-06E — publication distribution contracts (lazy history, exact version binding).
 */

export const FINANCE_PUBLICATION_DISTRIBUTION_MESSAGE_MAX_LENGTH = 500;

export const FINANCE_PUBLICATION_DISTRIBUTION_HISTORY_PAGE_SIZE = 10;

export const FINANCE_06E_PUBLICATION_HISTORY_CONTRACT = {
  PUBLICATION_HISTORY_DEPENDS_ON_DISTRIBUTION: false,
  DISTRIBUTION_HISTORY_LOADS_LAZILY: true,
  NO_N_PLUS_ONE_DISTRIBUTION_ON_HISTORY_OPEN: true,
  INITIAL_DISTRIBUTION_BATCH_SIZE: FINANCE_PUBLICATION_DISTRIBUTION_HISTORY_PAGE_SIZE,
} as const;

export type FinancePublicationDistributionRecipientInput =
  | {
      kind: "PERSON";
      personId: string;
    }
  | {
      kind: "EXTERNAL";
      email: string;
      displayName?: string | null;
    };
