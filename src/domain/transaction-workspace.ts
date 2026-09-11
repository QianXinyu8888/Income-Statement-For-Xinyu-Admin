import type { AnalyticsSummary } from './analytics';
import { summarizeTransactions } from './analytics';
import type { Transaction } from './transaction';
import type { TransactionListQuery, TransactionListResult } from './transaction-query';
import { queryTransactions } from './transaction-query';

export interface TransactionWorkspace {
  transactions: TransactionListResult;
  summary: AnalyticsSummary;
  warnings: string[];
}

export function buildTransactionWorkspace(
  records: Transaction[],
  warnings: string[],
  query: TransactionListQuery,
  summaryRange: { from?: string; to?: string },
): TransactionWorkspace {
  const summaryRecords = records.filter(
    (record) =>
      (!summaryRange.from || (record.soldDate !== null && record.soldDate >= summaryRange.from)) &&
      (!summaryRange.to || (record.soldDate !== null && record.soldDate <= summaryRange.to)),
  );
  return {
    transactions: queryTransactions(records, query),
    summary: summarizeTransactions(summaryRecords),
    warnings,
  };
}
