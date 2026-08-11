import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../api/client';
import { ErrorState, LoadingState } from '../components/LoadingState';

const money = new Intl.NumberFormat('zh-CN', {
  style: 'currency',
  currency: 'CNY',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const formatMoney = (value: number | null) => (value === null ? '—' : money.format(value));

export default function OverviewPage() {
  const summary = useQuery({ queryKey: ['summary'], queryFn: () => apiClient.summary() });
  if (summary.isLoading) return <LoadingState label="正在计算经营数据" />;
  if (summary.isError)
    return <ErrorState message={summary.error.message} onRetry={() => summary.refetch()} />;
  const data = summary.data!;
  const metrics = [
    ['销售额', formatMoney(data.revenue)],
    ['总成本', formatMoney(data.totalCost)],
    ['利润', formatMoney(data.profit)],
    ['ROI', data.roi === null ? '—' : `${(data.roi * 100).toFixed(1)}%`],
    ['成交笔数', `${data.count} 笔`],
  ];
  const monthly = data.monthly.filter(
    (item): item is typeof item & { profit: number } => item.profit !== null,
  );
  const max = Math.max(...monthly.map((item) => Math.abs(item.profit)), 1);
  return (
    <section className="page">
      <header className="page-header">
        <div>
          <h1>经营概览</h1>
          <p>已售出交易的核心经营结果</p>
        </div>
      </header>
      <div className="metric-grid">
        {metrics.map(([label, value]) => (
          <article key={label} className="metric">
            <span>{label}</span>
            <strong>{value}</strong>
          </article>
        ))}
      </div>
      {data.incompleteCount > 0 && (
        <div className="data-note" role="status">
          有 {data.incompleteCount} 条已售出记录字段不完整，未参与部分金额统计。
        </div>
      )}
      <section className="panel">
        <header>
          <h2>月度利润</h2>
          <span>最近 {monthly.length} 个月</span>
        </header>
        {monthly.length ? (
          <div className="simple-chart">
            {monthly.map((item) => (
              <div key={item.month} className="simple-chart__item">
                <span>{item.month.slice(5)}</span>
                <div>
                  <i
                    className={item.profit >= 0 ? 'bar-positive' : 'bar-negative'}
                    style={{ height: `${Math.max(4, (Math.abs(item.profit) / max) * 150)}px` }}
                  />
                </div>
                <strong>{money.format(item.profit)}</strong>
              </div>
            ))}
          </div>
        ) : (
          <div className="empty-inline">暂无已售出交易</div>
        )}
      </section>
    </section>
  );
}
