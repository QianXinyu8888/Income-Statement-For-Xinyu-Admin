import { z } from 'zod';

export const TRANSACTION_STATUSES = ['已售出', '在售中', '自用中', '已退货'] as const;
export type TransactionStatus = (typeof TRANSACTION_STATUSES)[number];

const money = z.number().finite().min(0).multipleOf(0.01);

export const transactionSchema = z
  .object({
    title: z.string().trim().min(1, '请输入商品名称').max(500),
    salePrice: money.nullable(),
    costPrice: money,
    shippingFee: money,
    status: z.enum(TRANSACTION_STATUSES),
    purchaseDate: z.string().date(),
    soldDate: z.string().date().nullable(),
    sortOrder: z.number().finite().nullable().default(null),
    note: z.string().trim().max(2000),
  })
  .superRefine((value, context) => {
    if (value.status === '已售出' && value.salePrice === null) {
      context.addIssue({
        code: 'custom',
        path: ['salePrice'],
        message: '已售出记录必须填写成交价',
      });
    }
    if (value.status === '已售出' && value.soldDate === null) {
      context.addIssue({
        code: 'custom',
        path: ['soldDate'],
        message: '已售出记录必须填写售出日期',
      });
    }
  });

export type TransactionInput = z.infer<typeof transactionSchema>;

export interface Transaction extends TransactionInput {
  id: string;
  totalCost: number;
  profit: number;
  profitRate: number | null;
  roi: number | null;
  holdingDays: number | null;
  updatedAt?: string;
}

export interface FeishuRecord {
  record_id?: string;
  id?: string;
  fields?: Record<string, unknown>;
  last_modified_time?: number | string;
}

function scalar(value: unknown): unknown {
  if (Array.isArray(value)) return value.length ? scalar(value[0]) : undefined;
  if (value && typeof value === 'object' && 'name' in value)
    return (value as { name?: unknown }).name;
  return value;
}

function numberValue(value: unknown, fallback = 0): number {
  if (value === '' || value === null || value === undefined) return fallback;
  const parsed = Number(scalar(value));
  if (!Number.isFinite(parsed)) throw new Error(`无效数字：${String(value)}`);
  return Math.round(parsed * 10000) / 10000;
}

function optionalNumber(value: unknown): number | null {
  if (value === '' || value === null || value === undefined) return null;
  return numberValue(value);
}

function dateValue(value: unknown, required: true): string;
function dateValue(value: unknown, required: false): string | null;
function dateValue(value: unknown, required: boolean): string | null {
  if (value === '' || value === null || value === undefined) {
    if (required) throw new Error('无效日期：空值');
    return null;
  }
  if (typeof value === 'number') {
    const parts = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Shanghai',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).formatToParts(new Date(value));
    const part = (type: Intl.DateTimeFormatPartTypes) =>
      parts.find((item) => item.type === type)?.value ?? '';
    return `${part('year')}-${part('month')}-${part('day')}`;
  }
  const text = String(scalar(value)).trim();
  const matched = text.match(/^\d{4}-\d{2}-\d{2}/);
  if (!matched) throw new Error(`无效日期：${text}`);
  return matched[0];
}

export function fromFeishuRecord(record: FeishuRecord): Transaction {
  const fields = record.fields ?? {};
  const rawStatus = String(scalar(fields['交易状态']) ?? '').trim();
  if (!TRANSACTION_STATUSES.includes(rawStatus as TransactionStatus))
    throw new Error(`未知交易状态：${rawStatus || '空值'}`);
  const status = rawStatus as TransactionStatus;
  const rawSalePrice = fields['成交价(¥)'];
  const input = transactionSchema.parse({
    title: String(scalar(fields['商品名称']) ?? '').trim(),
    salePrice:
      rawSalePrice === '' || rawSalePrice === null || rawSalePrice === undefined
        ? null
        : numberValue(rawSalePrice),
    costPrice: numberValue(fields['购入成本(¥)']),
    shippingFee: numberValue(fields['运费(¥)']),
    status,
    purchaseDate: dateValue(fields['购入日期'], true),
    soldDate: dateValue(fields['售出日期'], false),
    sortOrder: optionalNumber(fields['排序']),
    note: String(fields['备注'] ?? '').trim(),
  });
  const totalCost = optionalNumber(fields['总成本(¥)']) ?? input.costPrice + input.shippingFee;
  const calculatedProfit = input.salePrice === null ? -totalCost : input.salePrice - totalCost;
  const profit = optionalNumber(fields['利润(¥)']) ?? calculatedProfit;
  const roi = optionalNumber(fields['ROI']);
  return {
    id: record.record_id ?? record.id ?? '',
    ...input,
    totalCost,
    profit,
    profitRate: input.costPrice > 0 && input.salePrice !== null ? profit / input.costPrice : null,
    roi: roi ?? (totalCost > 0 && input.salePrice !== null ? profit / totalCost : null),
    holdingDays: optionalNumber(fields['持有天数']),
    updatedAt: record.last_modified_time
      ? new Date(Number(record.last_modified_time)).toISOString()
      : undefined,
  };
}

function dateTimestamp(date: string | null): number | null {
  return date ? new Date(`${date}T00:00:00+08:00`).getTime() : null;
}

export function toFeishuFields(value: TransactionInput): Record<string, unknown> {
  const input = transactionSchema.parse(value);
  return {
    商品名称: input.title,
    '成交价(¥)': input.salePrice,
    '购入成本(¥)': input.costPrice,
    '运费(¥)': input.shippingFee,
    交易状态: input.status,
    购入日期: dateTimestamp(input.purchaseDate),
    售出日期: dateTimestamp(input.soldDate),
    排序: input.sortOrder,
    备注: input.note,
  };
}
