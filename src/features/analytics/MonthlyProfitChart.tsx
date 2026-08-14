import { useRef, useState } from 'react';
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
  getTooltipPosition,
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
  const status = !item.hasProfit
    ? '暂无'
    : item.sign === 'positive'
      ? '盈利'
      : item.sign === 'negative'
        ? '亏损'
        : '持平';
  const valueClass = !item.hasProfit
    ? undefined
    : item.sign === 'negative'
      ? 'is-loss'
      : 'is-profit';

  return (
    <div className="monthly-profit-tooltip">
      <div className="monthly-profit-tooltip__heading">
        <span>{item.tooltipMonth}</span>
        <em className={valueClass}>{status}</em>
      </div>
      <strong className={valueClass}>{item.hasProfit ? fullMoney.format(item.profit) : '—'}</strong>
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

type ProfitBarEntry = Required<
  Pick<ProfitBarShapeProps, 'x' | 'y' | 'width' | 'height' | 'payload'>
>;

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
        <tspan x="0" dy="1.35em">
          {item.axisLabel}
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
  const chartRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLDivElement>(null);
  const [activeTooltip, setActiveTooltip] = useState<{
    item: MonthlyProfitDatum;
    left: number;
    top: number;
  } | null>(null);
  const data = buildMonthlyProfitData(monthly);
  if (!data.length) return <div className="empty-inline">暂无可用利润数据</div>;

  const width = Math.max(620, data.length * 84);
  const domain = getProfitDomain(data.map((item) => item.profit));

  const showTooltip = (entry: ProfitBarEntry) => {
    const chart = chartRef.current;
    const canvas = canvasRef.current;
    if (!chart || !canvas) return;

    const chartRect = chart.getBoundingClientRect();
    const canvasRect = canvas.getBoundingClientRect();
    const position = getTooltipPosition({
      barX: entry.x,
      barY: entry.y,
      barWidth: entry.width,
      barHeight: entry.height,
      canvasLeft: canvasRect.left - chartRect.left,
      canvasTop: canvasRect.top - chartRect.top,
      chartWidth: chartRect.width,
    });
    setActiveTooltip({ item: entry.payload, ...position });
  };

  return (
    <div ref={chartRef} className="monthly-profit-chart" role="img" aria-label="月度利润趋势图">
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
        style={
          activeTooltip
            ? { left: `${activeTooltip.left}px`, top: `${activeTooltip.top}px` }
            : undefined
        }
      >
        {activeTooltip && <ProfitTooltip item={activeTooltip.item} />}
      </div>
      <div
        className="monthly-profit-chart__scroll"
        data-testid="monthly-profit-scroll"
        onScroll={() => setActiveTooltip(null)}
        onMouseLeave={() => setActiveTooltip(null)}
      >
        <div
          ref={canvasRef}
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
                onMouseEnter={(entry) => showTooltip(entry as ProfitBarEntry)}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
