import { z } from 'zod';

export const TRANSACTION_STATUSES = ['待收货', '已售出', '在售中', '自用中', '已退货'] as const;
export type TransactionStatus = (typeof TRANSACTION_STATUSES)[number];

const money = z.number().finite().min(0).multipleOf(0.01);

export const transactionSchema = z.object({
  title: z.string().trim().min(1, '请输入商品名称').max(500),
  salePrice: money.nullable(),
  costPrice: money.nullable(),
  purchaseShippingFee: money.nullable(),
  saleShippingFee: money.nullable(),
  status: z.enum(TRANSACTION_STATUSES),
  purchaseDate: z.string().date().nullable(),
  soldDate: z.string().date().nullable(),
  note: z.string().trim().max(2000).nullable(),
});

export type TransactionInput = z.infer<typeof transactionSchema>;
export type EditableTransactionField = keyof TransactionInput;

export interface Transaction {
  id: string;
  title: string | null;
  salePrice: number | null;
  costPrice: number | null;
  purchaseShippingFee: number | null;
  saleShippingFee: number | null;
  totalCost: number | null;
  profit: number | null;
  roi: number | null;
  status: TransactionStatus | null;
  purchaseDate: string | null;
  soldDate: string | null;
  holdingDays: number | null;
  note: string | null;
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

function optionalNumber(value: unknown, field: string, warnings: string[]): number | null {
  if (value === '' || value === null || value === undefined) return null;
  const parsed = Number(scalar(value));
  if (!Number.isFinite(parsed)) {
    warnings.push(`${field} 无法解析：${String(scalar(value))}`);
    return null;
  }
  return Math.round(parsed * 10000) / 10000;
}

function dateValue(value: unknown, field: string, warnings: string[]): string | null {
  if (value === '' || value === null || value === undefined) return null;
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
  if (!matched) {
    warnings.push(`${field} 无法解析：${text}`);
    return null;
  }
  return matched[0];
}

function optionalText(value: unknown): string | null {
  if (value === '' || value === null || value === undefined) return null;
  const text = String(scalar(value)).trim();
  return text || null;
}

export function mapFeishuRecord(record: FeishuRecord): {
  transaction: Transaction;
  warnings: string[];
} {
  const fields = record.fields ?? {};
  const warnings: string[] = [];
  const rawStatus = optionalText(fields['交易状态']);
  const status = TRANSACTION_STATUSES.includes(rawStatus as TransactionStatus)
    ? (rawStatus as TransactionStatus)
    : null;
  if (rawStatus && !status) warnings.push(`未知交易状态：${rawStatus}`);
  const modified = Number(record.last_modified_time);
  return {
    transaction: {
      id: record.record_id ?? record.id ?? '',
      title: optionalText(fields['商品名称']),
      salePrice: optionalNumber(fields['成交价(¥)'], '成交价(¥)', warnings),
      costPrice: optionalNumber(fields['购入成本(¥)'], '购入成本(¥)', warnings),
      purchaseShippingFee: optionalNumber(
        fields['购入运费(¥)'] ?? fields['运费(¥)'],
        '购入运费(¥)',
        warnings,
      ),
      saleShippingFee: optionalNumber(fields['售出运费(¥)'], '售出运费(¥)', warnings),
      totalCost: optionalNumber(fields['总成本(¥)'], '总成本(¥)', warnings),
      profit: optionalNumber(fields['利润(¥)'], '利润(¥)', warnings),
      roi: optionalNumber(fields['ROI'], 'ROI', warnings),
      status,
      purchaseDate: dateValue(fields['购入日期'], '购入日期', warnings),
      soldDate: dateValue(fields['售出日期'], '售出日期', warnings),
      holdingDays: optionalNumber(fields['持有天数'], '持有天数', warnings),
      note: optionalText(fields['备注']),
      updatedAt:
        record.last_modified_time && Number.isFinite(modified)
          ? new Date(modified).toISOString()
          : undefined,
    },
    warnings,
  };
}

export function fromFeishuRecord(record: FeishuRecord): Transaction {
  return mapFeishuRecord(record).transaction;
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
    '购入运费(¥)': input.purchaseShippingFee,
    '售出运费(¥)': input.saleShippingFee,
    交易状态: input.status,
    购入日期: dateTimestamp(input.purchaseDate),
    售出日期: dateTimestamp(input.soldDate),
    备注: input.note,
  };
}
