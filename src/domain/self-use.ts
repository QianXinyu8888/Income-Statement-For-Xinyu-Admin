import type { Transaction, TransactionInput } from './transaction';

export const SELF_USE_STATUSES = ['自用中', '在售中'] as const;
export type SelfUseStatus = (typeof SELF_USE_STATUSES)[number];
export type SelfUseSort = 'purchaseDate' | 'holdingDays' | 'totalCost';

export interface SaleValues {
  salePrice: number;
  soldDate: string;
  note: string;
}

function isSelfUseStatus(status: Transaction['status']): status is SelfUseStatus {
  return SELF_USE_STATUSES.includes(status as SelfUseStatus);
}

function compareNullable(
  left: string | number | null,
  right: string | number | null,
  order: 'asc' | 'desc',
) {
  if (left === null && right === null) return 0;
  if (left === null) return 1;
  if (right === null) return -1;
  const result =
    typeof left === 'number' && typeof right === 'number'
      ? left - right
      : String(left).localeCompare(String(right), 'zh-CN');
  return order === 'asc' ? result : -result;
}

export function getSelfUseRecords(
  records: Transaction[],
  sort: SelfUseSort,
  order: 'asc' | 'desc',
  status?: SelfUseStatus,
) {
  return records
    .filter((record) => isSelfUseStatus(record.status) && (!status || record.status === status))
    .sort((left, right) => compareNullable(left[sort], right[sort], order));
}

export function createSaleInput(record: Transaction, values: SaleValues): TransactionInput {
  const title = record.title?.trim();
  if (!title) throw new Error('商品名称为空，无法确认售出');
  return {
    title,
    salePrice: values.salePrice,
    costPrice: record.costPrice,
    shippingFee: record.shippingFee,
    status: '已售出',
    purchaseDate: record.purchaseDate,
    soldDate: values.soldDate,
    note: values.note.trim() || null,
  };
}

export function previewProfit(salePrice: number | null, totalCost: number | null) {
  return salePrice === null || totalCost === null ? null : salePrice - totalCost;
}
