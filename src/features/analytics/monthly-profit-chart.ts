import type { AnalyticsSummary } from '../../domain/analytics';

type MonthlyItem = AnalyticsSummary['monthly'][number];

export type ProfitSign = 'positive' | 'negative' | 'zero';

export type MonthlyProfitDatum = MonthlyItem & {
  profit: number;
  yearLabel: string;
  monthLabel: string;
  tooltipMonth: string;
  compactProfit: string;
  sign: ProfitSign;
  isHighestPositive: boolean;
  isCurrentMonth: boolean;
};

const compactNumber = (value: number) => value.toFixed(1).replace(/\.0$/, '');

export function formatCompactCny(value: number) {
  const sign = value < 0 ? '-' : '';
  const absolute = Math.abs(value);

  if (absolute >= 100_000_000) {
    return `${sign}¥${compactNumber(absolute / 100_000_000)} 亿`;
  }
  if (absolute >= 10_000) {
    return `${sign}¥${compactNumber(absolute / 10_000)} 万`;
  }
  return `${sign}¥${new Intl.NumberFormat('zh-CN', { maximumFractionDigits: 0 }).format(absolute)}`;
}

export function getProfitDomain(values: number[]): [number, number] {
  const finite = values.filter(Number.isFinite);
  const minimum = Math.min(0, ...finite);
  const maximum = Math.max(0, ...finite);

  if (minimum === 0 && maximum === 0) return [-1, 1];

  const paddedMinimum = minimum < 0 ? -Math.ceil(Math.abs(minimum) * 1.15 * 100) / 100 : 0;
  const paddedMaximum = maximum > 0 ? Math.ceil(maximum * 1.15 * 100) / 100 : 0;
  return [paddedMinimum, paddedMaximum];
}

export function getBarLabelY({
  y,
  height,
  negative,
}: {
  y: number;
  height: number;
  negative: boolean;
}) {
  const otherEnd = y + height;
  return negative ? Math.max(y, otherEnd) + 16 : Math.min(y, otherEnd) - 10;
}

function currentMonthKey() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

export function buildMonthlyProfitData(
  monthly: MonthlyItem[],
  currentMonth = currentMonthKey(),
): MonthlyProfitDatum[] {
  const valid = monthly
    .filter(
      (item): item is MonthlyItem & { profit: number } =>
        item.profit !== null && Number.isFinite(item.profit),
    )
    .sort((left, right) => right.month.localeCompare(left.month));
  const highestPositive = Math.max(0, ...valid.map((item) => item.profit));

  return valid.map((item) => {
    const [year, rawMonth] = item.month.split('-');
    const month = Number(rawMonth);

    const compactProfit = formatCompactCny(item.profit);
    return {
      ...item,
      profit: item.profit,
      yearLabel: `${year.slice(-2)}年`,
      monthLabel: `${month}月`,
      tooltipMonth: `${year} 年 ${month} 月`,
      compactProfit,
      sign: item.profit > 0 ? 'positive' : item.profit < 0 ? 'negative' : 'zero',
      isHighestPositive: item.profit > 0 && item.profit === highestPositive,
      isCurrentMonth: item.month === currentMonth,
    };
  });
}
