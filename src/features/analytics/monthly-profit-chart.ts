import type { AnalyticsSummary } from '../../domain/analytics';

type MonthlyItem = AnalyticsSummary['monthly'][number];

export type ProfitSign = 'positive' | 'negative' | 'zero';

export type MonthlyProfitDatum = MonthlyItem & {
  profit: number;
  hasProfit: boolean;
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
  return `${sign}¥${new Intl.NumberFormat('zh-CN', {
    maximumFractionDigits: absolute > 0 && absolute < 1 ? 2 : 0,
  }).format(absolute)}`;
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

export function getTooltipPosition({
  barX,
  barY,
  barWidth,
  barHeight,
  canvasLeft,
  canvasTop,
  chartWidth,
}: {
  barX: number;
  barY: number;
  barWidth: number;
  barHeight: number;
  canvasLeft: number;
  canvasTop: number;
  chartWidth: number;
}) {
  const tooltipHalfWidth = Math.min(112, chartWidth / 2);
  const rawLeft = canvasLeft + barX + barWidth / 2;
  const visualBarTop = Math.min(barY, barY + barHeight);

  return {
    left: Math.min(chartWidth - tooltipHalfWidth, Math.max(tooltipHalfWidth, rawLeft)),
    top: Math.max(76, canvasTop + visualBarTop - 10),
  };
}

function currentMonthKey() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

function parseMonthKey(value: string) {
  const match = /^(\d{4})-(0[1-9]|1[0-2])$/.exec(value);
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  return year > 0 ? year * 12 + month - 1 : null;
}

function monthKeyFromIndex(index: number) {
  const year = Math.floor(index / 12);
  const month = (index % 12) + 1;
  return `${year}-${String(month).padStart(2, '0')}`;
}

export function completeMonthlyProfitMonths(
  monthly: MonthlyItem[],
  currentMonth = currentMonthKey(),
): MonthlyItem[] {
  const currentIndex = parseMonthKey(currentMonth);
  if (currentIndex === null) return [];

  const byMonth = new Map<string, MonthlyItem>();
  let earliestIndex = currentIndex;

  for (const item of monthly) {
    const index = parseMonthKey(item.month);
    if (index === null || index > currentIndex || byMonth.has(item.month)) continue;
    byMonth.set(item.month, item);
    earliestIndex = Math.min(earliestIndex, index);
  }

  const result: MonthlyItem[] = [];
  for (let index = currentIndex; index >= earliestIndex; index -= 1) {
    const month = monthKeyFromIndex(index);
    result.push(byMonth.get(month) ?? { month, revenue: 0, profit: 0, count: 0 });
  }
  return result;
}

export function buildMonthlyProfitData(
  monthly: MonthlyItem[],
  currentMonth = currentMonthKey(),
): MonthlyProfitDatum[] {
  const completed = completeMonthlyProfitMonths(monthly, currentMonth);
  const validProfits = completed
    .map((item) => item.profit)
    .filter((profit): profit is number => profit !== null && Number.isFinite(profit));
  const highestPositive = Math.max(0, ...validProfits);

  return completed.map((item) => {
    const [year, rawMonth] = item.month.split('-');
    const month = Number(rawMonth);
    const hasProfit = item.profit !== null && Number.isFinite(item.profit);
    const profit = hasProfit ? item.profit! : 0;
    return {
      ...item,
      profit,
      hasProfit,
      yearLabel: `${year.slice(-2)}年`,
      monthLabel: `${month}月`,
      tooltipMonth: `${year} 年 ${month} 月`,
      compactProfit: hasProfit ? formatCompactCny(profit) : '—',
      sign: profit > 0 ? 'positive' : profit < 0 ? 'negative' : 'zero',
      isHighestPositive: hasProfit && profit > 0 && profit === highestPositive,
      isCurrentMonth: item.month === currentMonth,
    };
  });
}
