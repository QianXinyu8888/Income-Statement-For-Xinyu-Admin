import { useMemo } from 'react';
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


const formatYearMonth = (monthStr: string) => {
  if (!monthStr || typeof monthStr !== 'string' || !monthStr.includes('-')) {
    return monthStr || '—';
  }
  const [year, month] = monthStr.split('-');
  return `${year}.${month}`;
};


export default function OverviewPage() {
  const summary = useQuery({ queryKey: ['summary'], queryFn: () => apiClient.summary() });

  // 确保 Hook 无条件在组件顶部按恒定顺序触发 (遵循 Rules of Hooks)
  const monthly = useMemo(() => {
    const list = summary.data?.monthly;
    if (!list || !Array.isArray(list)) return [];
    return [...list].sort((a, b) => String(a.month ?? '').localeCompare(String(b.month ?? '')));
  }, [summary.data?.monthly]);

  if (summary.isLoading) return <LoadingState label="正在计算经营数据" />;
  if (summary.isError)
    return <ErrorState message={summary.error.message} onRetry={() => summary.refetch()} />;
  const data = summary.data!;
  const metrics = [
    { key: 'revenue', label: '销售额', value: formatMoney(data.revenue) },
    { key: 'cost', label: '总成本', value: formatMoney(data.totalCost) },
    { key: 'profit', label: '利润', value: formatMoney(data.profit) },
    {
      key: 'roi',
      label: 'ROI',
      value: data.roi === null ? '—' : `${(data.roi * 100).toFixed(1)}%`,
    },
    { key: 'count', label: '成交笔数', value: `${data.count} 笔` },
  ];

  const max = Math.max(...monthly.map((item) => Math.abs(item.profit ?? 0)), 1);



  return (
    <section className="page">
      <header className="page-header">
        <div>
          <h1>经营概览</h1>
          <p>已售出交易的核心经营结果</p>
        </div>
      </header>
      <div className="metric-grid">
        {metrics.map(({ key, label, value }) => (
          <article key={key} className={`metric metric--${key}`}>
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
        <header className="panel-header-row">
          <h2 id="overview-monthly-profit-title">月度利润</h2>
          <span>最近 {monthly.length} 个月</span>
        </header>
        {monthly.length ? (
          <div className="simple-chart-wrapper">
            <div
              className="simple-chart"
              role="region"
              aria-labelledby="overview-monthly-profit-title"
            >
              {monthly.map((item, index) => {
                const profitVal = item.profit ?? 0;
                const ariaText = `${item.month} 利润：${formatMoney(item.profit)}`;
                return (
                  <div
                    key={item.month}
                    className="simple-chart__item"
                    role="img"
                    aria-label={ariaText}
                    style={{ '--bar-index': index } as React.CSSProperties}
                  >
                    <div
                      className="simple-chart__plot"
                      data-direction={profitVal >= 0 ? 'positive' : 'negative'}
                    >
                      <i
                        className={
                          item.profit === null
                            ? 'bar-empty'
                            : profitVal >= 0
                            ? 'bar-positive'
                            : 'bar-negative'
                        }
                        style={{
                          height: `${item.profit === null ? 4 : Math.max(4, (Math.abs(profitVal) / max) * 100)}%`,
                        }}
                      />
                    </div>
                    <div className="simple-chart__info">
                      <span className="simple-chart__month">{formatYearMonth(item.month)}</span>
                      <strong className="simple-chart__amount">{formatMoney(item.profit)}</strong>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="empty-inline">暂无已售出交易</div>
        )}
      </section>

    </section>
  );
}



