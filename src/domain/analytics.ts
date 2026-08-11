import type { Transaction, TransactionStatus } from './transaction';

export interface AnalyticsOrderIndexItem {
  id: string;
  title: string | null;
}

export interface AnalyticsSummary {
  revenue: number | null;
  totalCost: number | null;
  shipping: number | null;
  profit: number | null;
  roi: number | null;
  count: number;
  returnCount: number;
  returnLoss: number | null;
  incompleteCount: number;
  monthly: Array<{
    month: string;
    revenue: number | null;
    profit: number | null;
    count: number;
  }>;
  statuses: Array<{
    status: TransactionStatus | null;
    count: number;
    items: AnalyticsOrderIndexItem[];
  }>;
  brackets: Array<{ name: string; count: number; items: AnalyticsOrderIndexItem[] }>;
  returnItems: AnalyticsOrderIndexItem[];
}

const round = (value: number) => Math.round(value * 100) / 100;

function sumKnown(values: Array<number | null>): number | null {
  const known = values.filter((value): value is number => value !== null);
  return known.length ? round(known.reduce((sum, value) => sum + value, 0)) : null;
}

export function summarizeTransactions(records: Transaction[]): AnalyticsSummary {
  const sold = records.filter((record) => record.status === '已售出');
  const returned = records.filter((record) => record.status === '已退货');
  const revenue = sumKnown(sold.map((record) => record.salePrice));
  const totalCost = sumKnown(sold.map((record) => record.totalCost));
  const shipping = sumKnown(sold.map((record) => record.shippingFee));
  const profit = sumKnown(sold.map((record) => record.profit));
  const monthlyMap = new Map<string, Transaction[]>();
  sold.forEach((record) => {
    if (!record.soldDate) return;
    const month = record.soldDate.slice(0, 7);
    monthlyMap.set(month, [...(monthlyMap.get(month) ?? []), record]);
  });
  const indexItem = ({ id, title }: Transaction): AnalyticsOrderIndexItem => ({ id, title });
  const statusMap = new Map<TransactionStatus | null, AnalyticsOrderIndexItem[]>();
  records.forEach((record) => {
    const items = statusMap.get(record.status) ?? [];
    statusMap.set(record.status, [...items, indexItem(record)]);
  });
  const bracketNames = ['高收益', '稳健盈利', '平价回血', '亏损'] as const;
  const bracketItems: Record<(typeof bracketNames)[number], AnalyticsOrderIndexItem[]> = {
    高收益: [],
    稳健盈利: [],
    平价回血: [],
    亏损: [],
  };
  sold.forEach((record) => {
    const value = record.profit;
    if (value === null) return;
    if (value > 500) bracketItems.高收益.push(indexItem(record));
    else if (value >= 100) bracketItems.稳健盈利.push(indexItem(record));
    else if (value >= 0) bracketItems.平价回血.push(indexItem(record));
    else bracketItems.亏损.push(indexItem(record));
  });
  const returnLoss = sumKnown(
    returned.map((record) =>
      record.profit !== null && record.profit < 0 ? Math.abs(record.profit) : null,
    ),
  );
  return {
    revenue,
    totalCost,
    shipping,
    profit,
    roi: profit !== null && totalCost !== null && totalCost > 0 ? profit / totalCost : null,
    count: sold.length,
    returnCount: returned.length,
    returnLoss,
    incompleteCount: sold.filter(
      (record) =>
        record.salePrice === null ||
        record.totalCost === null ||
        record.profit === null ||
        record.soldDate === null,
    ).length,
    monthly: [...monthlyMap.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([month, values]) => ({
        month,
        revenue: sumKnown(values.map((record) => record.salePrice)),
        profit: sumKnown(values.map((record) => record.profit)),
        count: values.length,
      })),
    statuses: [...statusMap.entries()].map(([status, items]) => ({
      status,
      count: items.length,
      items,
    })),
    brackets: bracketNames.map((name) => ({
      name,
      count: bracketItems[name].length,
      items: bracketItems[name],
    })),
    returnItems: returned.map(indexItem),
  };
}
