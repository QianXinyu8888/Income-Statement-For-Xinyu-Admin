import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { apiClient } from '../api/client';
import { ErrorState, LoadingState } from '../components/LoadingState';
import type { AnalyticsOrderIndexItem } from '../domain/analytics';

const money = new Intl.NumberFormat('zh-CN', {
  style: 'currency',
  currency: 'CNY',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

function DrilldownGroup({
  groupKey,
  label,
  items,
  expanded,
  onToggle,
}: {
  groupKey: string;
  label: string;
  items: AnalyticsOrderIndexItem[];
  expanded: boolean;
  onToggle: () => void;
}) {
  const regionId = `analytics-products-${groupKey.replace(/[^a-zA-Z0-9_-]/g, '-')}`;
  return (
    <div className={expanded ? 'drilldown-group drilldown-group--expanded' : 'drilldown-group'}>
      <button
        className="drilldown-toggle"
        type="button"
        aria-expanded={expanded}
        aria-controls={regionId}
        disabled={!items.length}
        onClick={onToggle}
      >
        <span>{label}</span>
        <strong>{items.length} 笔</strong>
        <ChevronDown size={15} aria-hidden="true" />
      </button>
      {expanded && (
        <div className="drilldown-products" id={regionId}>
          {items.map((item, index) => (
            <Link
              className="drilldown-product"
              key={item.id}
              to={`/transactions?focus=${encodeURIComponent(item.id)}`}
            >
              <span className="drilldown-product__index" aria-hidden="true">
                {index + 1}
              </span>
              <span className="drilldown-product__title">{item.title ?? '未命名交易'}</span>
              <ChevronRight className="drilldown-product__arrow" size={15} aria-hidden="true" />
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

function StatCardTitle({ children }: { children: string }) {
  return (
    <header className="analytics-stat-card__header">
      <span className="analytics-stat-card__title-mark" aria-hidden="true" />
      <h2>{children}</h2>
    </header>
  );
}

export default function AnalyticsPage() {
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [expanded, setExpanded] = useState<string | null>(null);
  const summary = useQuery({
    queryKey: ['summary', from, to],
    queryFn: () => apiClient.summary(from || undefined, to || undefined),
  });
  return (
    <section className="page">
      <header className="page-header">
        <div>
          <h1>利润分析</h1>
          <p>看清利润来自哪里，以及哪些交易需要关注</p>
        </div>
        <div className="date-range">
          <input
            aria-label="开始日期"
            type="date"
            value={from}
            onChange={(event) => setFrom(event.target.value)}
          />
          <span>至</span>
          <input
            aria-label="结束日期"
            type="date"
            value={to}
            onChange={(event) => setTo(event.target.value)}
          />
        </div>
      </header>
      {summary.isLoading ? (
        <LoadingState />
      ) : summary.isError ? (
        <ErrorState message={summary.error.message} onRetry={() => summary.refetch()} />
      ) : (
        <div className="analytics-grid">
          {summary.data!.incompleteCount > 0 && (
            <div className="data-note panel--wide" role="status">
              有 {summary.data!.incompleteCount}{' '}
              条已售出记录字段不完整，图表和金额只使用飞书中的真实值。
            </div>
          )}
          <section className="panel panel--wide">
            <header>
              <h2>月度趋势</h2>
            </header>
            {summary.data!.monthly.some((item) => item.profit !== null) ? (
              <div className="chart" role="img" aria-label="月度利润趋势图">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={summary.data!.monthly.filter((item) => item.profit !== null)}>
                    <CartesianGrid stroke="var(--border)" vertical={false} />
                    <XAxis dataKey="month" tickLine={false} axisLine={false} />
                    <YAxis tickLine={false} axisLine={false} />
                    <Tooltip />
                    <Bar dataKey="profit" name="利润" fill="var(--accent)" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="empty-inline">暂无可用利润数据</div>
            )}
          </section>
          <section className="panel analytics-stat-card">
            <StatCardTitle>利润区间</StatCardTitle>
            <div className="stat-list">
              {summary.data!.brackets.map((item) => (
                <DrilldownGroup
                  key={item.name}
                  groupKey={`bracket-${item.name}`}
                  label={item.name}
                  items={item.items}
                  expanded={expanded === `bracket-${item.name}`}
                  onToggle={() =>
                    setExpanded((current) =>
                      current === `bracket-${item.name}` ? null : `bracket-${item.name}`,
                    )
                  }
                />
              ))}
            </div>
          </section>
          <section className="panel analytics-stat-card">
            <StatCardTitle>状态分布</StatCardTitle>
            <div className="stat-list">
              {summary.data!.statuses.map((item) => (
                <DrilldownGroup
                  key={item.status ?? 'unknown'}
                  groupKey={`status-${item.status ?? 'unknown'}`}
                  label={item.status ?? '—'}
                  items={item.items}
                  expanded={expanded === `status-${item.status ?? 'unknown'}`}
                  onToggle={() =>
                    setExpanded((current) =>
                      current === `status-${item.status ?? 'unknown'}`
                        ? null
                        : `status-${item.status ?? 'unknown'}`,
                    )
                  }
                />
              ))}
            </div>
          </section>
          <section className="panel analytics-stat-card">
            <StatCardTitle>退货摘要</StatCardTitle>
            <div className="stat-list">
              <DrilldownGroup
                groupKey="returns"
                label="退货笔数"
                items={summary.data!.returnItems}
                expanded={expanded === 'returns'}
                onToggle={() =>
                  setExpanded((current) => (current === 'returns' ? null : 'returns'))
                }
              />
              <div>
                <span>退货损失</span>
                <strong>
                  {summary.data!.returnLoss === null ? '—' : money.format(summary.data!.returnLoss)}
                </strong>
              </div>
            </div>
          </section>
        </div>
      )}
    </section>
  );
}
