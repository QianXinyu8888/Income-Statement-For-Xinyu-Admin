import { z } from 'zod';

export const TRANSACTION_STATUSES = ['已售出', '自用中', '已退货'] as const;
export type TransactionStatus = (typeof TRANSACTION_STATUSES)[number];

const money = z.number().finite().min(0).multipleOf(0.01);

export const transactionSchema = z
  .object({
    title: z.string().trim().min(1, '请输入商品名称').max(200),
    category: z.string().trim().min(1).max(50),
    salePrice: money.nullable(),
    costPrice: money,
    shippingFee: money,
    status: z.enum(TRANSACTION_STATUSES),
    transactionDate: z.string().date(),
    note: z.string().trim().max(1000),
  })
  .superRefine((value, context) => {
    if (value.status === '已售出' && value.salePrice === null) {
      context.addIssue({ code: 'custom', path: ['salePrice'], message: '已售出记录必须填写售价' });
    }
  });

export type TransactionInput = z.infer<typeof transactionSchema>;

export interface Transaction extends TransactionInput {
  id: string;
  profit: number;
  profitRate: number | null;
  updatedAt?: string;
}

export interface FeishuRecord {
  record_id?: string;
  id?: string;
  fields?: Record<string, unknown>;
  last_modified_time?: number | string;
}

function scalar(value: unknown): unknown {
  if (value && typeof value === 'object' && 'name' in value) {
    return (value as { name?: unknown }).name;
  }
  return value;
}

function numberValue(value: unknown, fallback = 0): number {
  if (value === '' || value === null || value === undefined) return fallback;
  const parsed = Number(scalar(value));
  if (!Number.isFinite(parsed)) throw new Error(`无效金额：${String(value)}`);
  return Math.round(parsed * 100) / 100;
}

function dateValue(value: unknown): string {
  if (typeof value === 'number') return new Date(value).toISOString().slice(0, 10);
  const text = String(scalar(value) ?? '').trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(text)) throw new Error(`无效交易日期：${text || '空值'}`);
  return text;
}

export function calculateProfit(
  input: Pick<TransactionInput, 'salePrice' | 'costPrice' | 'shippingFee'>,
) {
  if (input.salePrice === null)
    return { profit: -input.costPrice - input.shippingFee, profitRate: null };
  const profit = Math.round((input.salePrice - input.costPrice - input.shippingFee) * 100) / 100;
  return { profit, profitRate: input.costPrice > 0 ? profit / input.costPrice : null };
}

export function fromFeishuRecord(record: FeishuRecord): Transaction {
  const fields = record.fields ?? {};
  const rawStatus = String(scalar(fields['交易状态']) ?? '').trim();
  if (!TRANSACTION_STATUSES.includes(rawStatus as TransactionStatus)) {
    throw new Error(`未知交易状态：${rawStatus || '空值'}`);
  }
  const status = rawStatus as TransactionStatus;
  const rawSalePrice = fields['成交价(¥)'];
  const input = transactionSchema.parse({
    title: String(fields['商品名称'] ?? '').trim(),
    category: String(scalar(fields['品类']) ?? '未分类').trim(),
    salePrice:
      rawSalePrice === '' || rawSalePrice === null || rawSalePrice === undefined
        ? null
        : numberValue(rawSalePrice),
    costPrice: numberValue(fields['购入成本(¥)']),
    shippingFee: numberValue(fields['运费(¥)']),
    status,
    transactionDate: dateValue(fields['交易日期']),
    note: String(fields['备注'] ?? '').trim(),
  });
  const calculated = calculateProfit(input);
  const formulaProfit = fields['利润(¥)'];
  const profit =
    formulaProfit === null || formulaProfit === undefined
      ? calculated.profit
      : numberValue(formulaProfit);
  return {
    id: record.record_id ?? record.id ?? '',
    ...input,
    profit,
    profitRate: input.costPrice > 0 && input.salePrice !== null ? profit / input.costPrice : null,
    updatedAt: record.last_modified_time
      ? new Date(Number(record.last_modified_time)).toISOString()
      : undefined,
  };
}

export function toFeishuFields(value: TransactionInput): Record<string, unknown> {
  const input = transactionSchema.parse(value);
  return {
    商品名称: input.title,
    品类: input.category,
    '成交价(¥)': input.salePrice,
    '购入成本(¥)': input.costPrice,
    '运费(¥)': input.shippingFee,
    交易状态: input.status,
    交易日期: new Date(`${input.transactionDate}T00:00:00+08:00`).getTime(),
    备注: input.note,
  };
}
