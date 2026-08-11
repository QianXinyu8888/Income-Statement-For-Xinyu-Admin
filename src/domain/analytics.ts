import type { Transaction } from './transaction';

export interface AnalyticsSummary {
  revenue: number;
  cost: number;
  shipping: number;
  profit: number;
  profitRate: number | null;
  count: number;
  monthly: Array<{ month: string; revenue: number; profit: number; count: number }>;
  categories: Array<{ category: string; revenue: number; profit: number; count: number }>;
  brackets: Array<{ name: string; count: number }>;
}

const round = (value: number) => Math.round(value * 100) / 100;

export function summarizeTransactions(records: Transaction[]): AnalyticsSummary {
  const sold = records.filter((record) => record.status === '已售出' && record.salePrice !== null);
  const revenue = round(sold.reduce((sum, record) => sum + (record.salePrice ?? 0), 0));
  const cost = round(sold.reduce((sum, record) => sum + record.costPrice, 0));
  const shipping = round(sold.reduce((sum, record) => sum + record.shippingFee, 0));
  const profit = round(sold.reduce((sum, record) => sum + record.profit, 0));
  const monthlyMap = new Map<string, { revenue: number; profit: number; count: number }>();
  const categoryMap = new Map<string, { revenue: number; profit: number; count: number }>();
  sold.forEach((record) => {
    const month = record.transactionDate.slice(0, 7);
    const monthly = monthlyMap.get(month) ?? { revenue: 0, profit: 0, count: 0 };
    monthly.revenue = round(monthly.revenue + (record.salePrice ?? 0));
    monthly.profit = round(monthly.profit + record.profit);
    monthly.count += 1;
    monthlyMap.set(month, monthly);

    const category = categoryMap.get(record.category) ?? { revenue: 0, profit: 0, count: 0 };
    category.revenue = round(category.revenue + (record.salePrice ?? 0));
    category.profit = round(category.profit + record.profit);
    category.count += 1;
    categoryMap.set(record.category, category);
  });
  const bracketNames = ['高收益', '稳健盈利', '平价回血', '亏损'] as const;
  const bracketCounts: Record<(typeof bracketNames)[number], number> = {
    高收益: 0,
    稳健盈利: 0,
    平价回血: 0,
    亏损: 0,
  };
  sold.forEach(({ profit: value }) => {
    if (value > 500) bracketCounts.高收益 += 1;
    else if (value >= 100) bracketCounts.稳健盈利 += 1;
    else if (value >= 0) bracketCounts.平价回血 += 1;
    else bracketCounts.亏损 += 1;
  });
  return {
    revenue,
    cost,
    shipping,
    profit,
    profitRate: cost > 0 ? profit / cost : null,
    count: sold.length,
    monthly: [...monthlyMap.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([month, value]) => ({ month, ...value })),
    categories: [...categoryMap.entries()]
      .map(([category, value]) => ({ category, ...value }))
      .sort((a, b) => b.profit - a.profit),
    brackets: bracketNames.map((name) => ({ name, count: bracketCounts[name] })),
  };
}
