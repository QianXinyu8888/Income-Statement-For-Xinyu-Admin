import type { Transaction, TransactionInput } from './transaction';

export const SELF_USE_STATUSES = ['自用中', '在售中'] as const;
export type SelfUseStatus = (typeof SELF_USE_STATUSES)[number];
export type SelfUseSort = 'purchaseDate' | 'holdingDays' | 'totalCost';

export interface SaleValues {
  salePrice: number | null;
  soldDate: string | null;
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
    purchaseShippingFee: record.purchaseShippingFee,
    saleShippingFee: record.saleShippingFee,
    status: '已售出',
    purchaseDate: record.purchaseDate,
    soldDate: values.soldDate,
    note: values.note.trim() || null,
  };
}

export function previewProfit(salePrice: number | null, totalCost: number | null) {
  return salePrice === null || totalCost === null ? null : salePrice - totalCost;
}

export function getUsageDayNumber(purchaseDate: string | null, today = new Date()) {
  if (!purchaseDate) return null;
  const [year, month, day] = purchaseDate.split('-').map(Number);
  const purchaseDay = new Date(year, month - 1, day);
  if (
    !Number.isFinite(purchaseDay.getTime()) ||
    purchaseDay.getFullYear() !== year ||
    purchaseDay.getMonth() !== month - 1 ||
    purchaseDay.getDate() !== day
  ) {
    return null;
  }

  const currentDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const daysSincePurchase = Math.floor((currentDay.getTime() - purchaseDay.getTime()) / 86_400_000);
  return daysSincePurchase < 0 ? null : daysSincePurchase + 1;
}
