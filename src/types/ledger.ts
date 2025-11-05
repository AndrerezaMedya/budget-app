export type TransactionType = "income" | "expense" | "transfer";

export interface TransactionBase {
  id: string;
  userId: string;
  accountId: string;
  categoryId: string | null;
  payeeId?: string | null;
  tagIds?: string[];
  type: TransactionType;
  description: string;
  amountMinor: number;
  currency: string;
  bookedAt: string; // ISO string in UTC
  createdAt: string;
  updatedAt: string;
}

export interface TransferTransaction extends TransactionBase {
  type: "transfer";
  transferGroupId: string;
  direction: "in" | "out";
  counterpartyAccountId: string;
}

export interface LedgerTransaction extends TransactionBase {
  type: Exclude<TransactionType, "transfer">;
  transferGroupId?: undefined;
  direction?: undefined;
  counterpartyAccountId?: undefined;
}

export type Transaction = LedgerTransaction | TransferTransaction;

export interface Account {
  id: string;
  userId: string;
  name: string;
  type: "bank" | "cash" | "wallet" | "investment" | "other";
  currency: string;
  openingBalanceMinor: number;
  createdAt: string;
  updatedAt: string;
  archivedAt?: string | null;
}

export interface Category {
  id: string;
  userId: string;
  name: string;
  parentId?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CategoryMonthlySummary {
  id: string;
  userId: string;
  categoryId: string;
  period: string; // YYYY-MM
  incomeMinor: number;
  expenseMinor: number;
  budgetMinor: number;
  availableMinor: number;
  updatedAt: string;
}

export interface AccountDailySummary {
  id: string;
  userId: string;
  accountId: string;
  date: string; // YYYY-MM-DD
  netChangeMinor: number;
  closingBalanceMinor: number;
  updatedAt: string;
}
