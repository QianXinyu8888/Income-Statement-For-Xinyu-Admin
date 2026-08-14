import { useState } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  ReferenceLine,
  Rectangle,
  ResponsiveContainer,
  XAxis,
  YAxis,
} from 'recharts';
import type { AnalyticsSummary } from '../../domain/analytics';
import {
  buildMonthlyProfitData,
  getBarLabelY,
  getProfitDomain,
  type MonthlyProfitDatum,
} from './monthly-profit-chart';

type MonthlyProfitChartProps = {
  monthly: AnalyticsSummary['monthly'];
};

const fullMoney = new Intl.NumberFormat('zh-CN', {
  style: 'currency',
  currency: 'CNY',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

function ProfitTooltip({ item }: { item: MonthlyProfitDatum }) {
  return (
    <div className="monthly-profit-tooltip">
      <span>{item.tooltipMonth}</span>
      <strong className={item.sign === 'negative' ? 'is-loss' : 'is-profit'}>
        {fullMoney.format(item.profit)}
      </strong>
    </div>
  );
}

type ProfitBarShapeProps = {
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  payload?: MonthlyProfitDatum;
};

type MonthAxisTickProps = {
  x?: number;
  y?: number;
  payload?: { index?: number };
  data: MonthlyProfitDatum[];
};

function MonthAxisTick({ x = 0, y = 0, payload, data }: MonthAxisTickProps) {
  const item = data[payload?.index ?? -1];
  if (!item) return null;

  return (
    <g
      className={`monthly-profit-chart__axis-tick${item.isCurrentMonth ? ' is-current' : ''}`}
      data-testid={item.isCurrentMonth ? 'current-month-tick' : undefined}
      transform={`translate(${x} ${y})`}
    >
      <text textAnchor="middle">
        <tspan x="0" dy="1em">
          {item.yearLabel}
        </tspan>
        <tspan x="0" dy="1.35em">
          {item.monthLabel}
        </tspan>
      </text>
    </g>
  );
}

function ProfitBarShape({ x = 0, y = 0, width = 0, height = 0, payload }: ProfitBarShapeProps) {
  if (!payload) return null;

  const fill =
    payload.sign === 'positive'
      ? 'var(--profit)'
      : payload.sign === 'negative'
        ? 'var(--loss)'
        : 'var(--muted)';
  const labelY = getBarLabelY({ y, height, negative: payload.sign === 'negative' });

  return (
    <g>
      <Rectangle
        data-testid={`profit-bar-${payload.month}`}
        x={x}
        y={y}
        width={width}
        height={height}
        radius={[6, 6, 6, 6]}
        fill={fill}
        stroke={payload.isHighestPositive ? 'var(--profit-strong)' : 'none'}
        strokeWidth={payload.isHighestPositive ? 2 : 0}
      />
      <text
        className="monthly-profit-chart__label"
        x={x + width / 2}
        y={labelY}
        textAnchor="middle"
      >
        {payload.compactProfit}
      </text>
    </g>
  );
}

export function MonthlyProfitChart({ monthly }: MonthlyProfitChartProps) {
  const [activeItem, setActiveItem] = useState<MonthlyProfitDatum | null>(null);
  const data = buildMonthlyProfitData(monthly);
  if (!data.length) return <div className="empty-inline">暂无可用利润数据</div>;

  const width = Math.max(620, data.length * 84);
  const domain = getProfitDomain(data.map((item) => item.profit));

  return (
    <div className="monthly-profit-chart" role="img" aria-label="月度利润趋势图">
      <div className="monthly-profit-chart__legend" aria-hidden="true">
        <span>
          <i data-testid="profit-legend-swatch" style={{ backgroundColor: 'var(--profit)' }} />
          盈利
        </span>
        <span>
          <i data-testid="loss-legend-swatch" style={{ backgroundColor: 'var(--loss)' }} />
          亏损
        </span>
      </div>
      <div
        className="monthly-profit-chart__tooltip-host"
        data-testid="monthly-profit-tooltip-host"
        aria-live="polite"
      >
        {activeItem && <ProfitTooltip item={activeItem} />}
      </div>
      <div className="monthly-profit-chart__scroll" data-testid="monthly-profit-scroll">
        <div
          className="monthly-profit-chart__canvas"
          data-testid="monthly-profit-canvas"
          style={{ width }}
        >
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 34, right: 56, bottom: 4, left: 56 }}>
              <CartesianGrid stroke="var(--border)" vertical={false} />
              <XAxis
                dataKey="month"
                tick={<MonthAxisTick data={data} />}
                tickLine={false}
                axisLine={false}
                interval={0}
                height={44}
              />
              <YAxis domain={domain} hide />
              <ReferenceLine y={0} stroke="var(--border-strong)" />
              <Bar
                dataKey="profit"
                radius={[6, 6, 6, 6]}
                maxBarSize={34}
                shape={<ProfitBarShape />}
                onMouseEnter={(entry) => setActiveItem(entry.payload as MonthlyProfitDatum)}
                onMouseLeave={() => setActiveItem(null)}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
