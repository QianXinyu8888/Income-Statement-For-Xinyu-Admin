import type { Transaction, TransactionStatus } from './transaction';

export type TransactionSortKey =
  | 'soldDate'
  | 'purchaseDate'
  | 'title'
  | 'salePrice'
  | 'costPrice'
  | 'totalCost'
  | 'profit'
  | 'status'
  | 'sortOrder';

export interface TransactionListQuery {
  page: number;
  pageSize: number;
  q?: string;
  status?: TransactionStatus;
  from?: string;
  to?: string;
  sort: TransactionSortKey;
  order: 'asc' | 'desc';
  focusId?: string;
}

export interface TransactionListResult {
  items: Transaction[];
  total: number;
  page: number;
  pageSize: number;
}

export function queryTransactions(
  records: Transaction[],
  query: TransactionListQuery,
): TransactionListResult {
  const q = (query.q ?? '').toLocaleLowerCase('zh-CN');
  const filtered = records
    .filter((record) => {
      const date = record.soldDate ?? record.purchaseDate;
      return (
        (!q ||
          `${record.title ?? ''} ${record.note ?? ''}`.toLocaleLowerCase('zh-CN').includes(q)) &&
        (!query.status || record.status === query.status) &&
        (!query.from || (date !== null && date >= query.from)) &&
        (!query.to || (date !== null && date <= query.to))
      );
    })
    .sort((a, b) => {
      const left = a[query.sort];
      const right = b[query.sort];
      if (query.sort === 'sortOrder') {
        if (left === null && right === null) return 0;
        if (left === null) return 1;
        if (right === null) return -1;
      }
      const result =
        typeof left === 'number' && typeof right === 'number'
          ? left - right
          : String(left ?? '').localeCompare(String(right ?? ''), 'zh-CN');
      return query.order === 'asc' ? result : -result;
    });
  const focusIndex = query.focusId
    ? filtered.findIndex((record) => record.id === query.focusId)
    : -1;
  const page = focusIndex >= 0 ? Math.floor(focusIndex / query.pageSize) + 1 : query.page;
  const start = (page - 1) * query.pageSize;
  return {
    items: filtered.slice(start, start + query.pageSize),
    total: filtered.length,
    page,
    pageSize: query.pageSize,
  };
}
