import "server-only";

export const CACHE_TAGS = {
  overviewSnapshot: "overview:snapshot",
  accountsList: "accounts:list",
  budgetsList: "budgets:list",
  transactionsRecent: "transactions:recent",
  transactionsSummary: "transactions:summary",
} as const;
