import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../api/client';
import { ErrorState, LoadingState } from '../components/LoadingState';

const money = new Intl.NumberFormat('zh-CN', {
  style: 'currency',
  currency: 'CNY',
  maximumFractionDigits: 0,
});

export default function OverviewPage() {
  const summary = useQuery({ queryKey: ['summary'], queryFn: () => apiClient.summary() });
  if (summary.isLoading) return <LoadingState label="正在计算经营数据" />;
  if (summary.isError)
    return <ErrorState message={summary.error.message} onRetry={() => summary.refetch()} />;
  const data = summary.data!;
  const metrics = [
    ['销售额', money.format(data.revenue)],
    ['成本', money.format(data.cost)],
    ['利润', money.format(data.profit)],
    ['利润率', data.profitRate === null ? '—' : `${(data.profitRate * 100).toFixed(1)}%`],
    ['成交笔数', `${data.count} 笔`],
  ];
  const max = Math.max(...data.monthly.map((item) => Math.abs(item.profit)), 1);
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
      <section className="panel">
        <header>
          <h2>月度利润</h2>
          <span>最近 {data.monthly.length} 个月</span>
        </header>
        {data.monthly.length ? (
          <div className="simple-chart">
            {data.monthly.map((item) => (
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
