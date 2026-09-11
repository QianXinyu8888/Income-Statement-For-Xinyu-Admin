import type { Transaction, TransactionStatus } from './transaction';

export type TransactionDateField = 'purchaseDate' | 'soldDate';

export type TransactionSortKey =
  | 'soldDate'
  | 'purchaseDate'
  | 'title'
  | 'salePrice'
  | 'costPrice'
  | 'totalCost'
  | 'profit'
  | 'status'
  | 'sourceOrder';

export interface TransactionListQuery {
  page: number;
  pageSize: number;
  q?: string;
  status?: TransactionStatus;
  dateField?: TransactionDateField;
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
  const filtered = records.filter((record) => {
    const date = record[query.dateField ?? 'purchaseDate'];
    return (
      (!q || (record.title ?? '').toLocaleLowerCase('zh-CN').includes(q)) &&
      (!query.status || record.status === query.status) &&
      (!query.from || (date !== null && date >= query.from)) &&
      (!query.to || (date !== null && date <= query.to))
    );
  });
  const sort = query.sort;
  const ordered =
    sort === 'sourceOrder'
      ? query.order === 'desc'
        ? [...filtered].reverse()
        : filtered
      : [...filtered].sort((a, b) => {
          const left = a[sort];
          const right = b[sort];
          if ((left === null || left === undefined) && (right === null || right === undefined))
            return 0;
          if (left === null || left === undefined) return 1;
          if (right === null || right === undefined) return -1;
          const result =
            typeof left === 'number' && typeof right === 'number'
              ? left - right
              : String(left).localeCompare(String(right), 'zh-CN');
          return query.order === 'asc' ? result : -result;
        });
  const focusIndex = query.focusId
    ? ordered.findIndex((record) => record.id === query.focusId)
    : -1;
  const page = focusIndex >= 0 ? Math.floor(focusIndex / query.pageSize) + 1 : query.page;
  const start = (page - 1) * query.pageSize;
  return {
    items: ordered.slice(start, start + query.pageSize),
    total: ordered.length,
    page,
    pageSize: query.pageSize,
  };
}
