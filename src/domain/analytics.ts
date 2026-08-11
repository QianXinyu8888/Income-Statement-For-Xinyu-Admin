import type { Transaction, TransactionStatus } from './transaction';

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
  statuses: Array<{ status: TransactionStatus | null; count: number }>;
  brackets: Array<{ name: string; count: number }>;
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
  const statusMap = new Map<TransactionStatus | null, number>();
  records.forEach((record) =>
    statusMap.set(record.status, (statusMap.get(record.status) ?? 0) + 1),
  );
  const bracketNames = ['高收益', '稳健盈利', '平价回血', '亏损'] as const;
  const bracketCounts = { 高收益: 0, 稳健盈利: 0, 平价回血: 0, 亏损: 0 };
  sold.forEach(({ profit: value }) => {
    if (value === null) return;
    if (value > 500) bracketCounts.高收益 += 1;
    else if (value >= 100) bracketCounts.稳健盈利 += 1;
    else if (value >= 0) bracketCounts.平价回血 += 1;
    else bracketCounts.亏损 += 1;
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
    statuses: [...statusMap.entries()].map(([status, count]) => ({ status, count })),
    brackets: bracketNames.map((name) => ({ name, count: bracketCounts[name] })),
  };
}
