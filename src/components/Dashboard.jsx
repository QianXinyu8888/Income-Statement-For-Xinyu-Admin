import React, { useMemo } from 'react';
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer,
} from 'recharts';
import { TrendingUp, TrendingDown, Plus, ArrowRight } from 'lucide-react';

function KpiCard({ label, value, sub, trend, trendUp, accent }) {
  return (
    <div className="card" style={{ padding: '20px 20px 16px' }}>
      <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '10px', fontWeight: 500 }}>
        {label}
      </div>
      <div style={{
        fontSize: '26px', fontWeight: 700, color: accent ? 'var(--accent)' : 'var(--text-primary)',
        letterSpacing: '-0.04em', fontVariantNumeric: 'tabular-nums',
        lineHeight: 1.1, marginBottom: '8px',
      }}>
        {value}
      </div>
      {sub && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '12px', color: 'var(--text-tertiary)' }}>
          {trend !== undefined && (
            trendUp
              ? <TrendingUp size={12} style={{ color: 'var(--success)' }} />
              : <TrendingDown size={12} style={{ color: 'var(--danger)' }} />
          )}
          {sub}
        </div>
      )}
    </div>
  );
}

const CustomTooltip = ({ active, payload }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{
      background: 'var(--bg-surface)',
      border: '1px solid var(--border)',
      borderRadius: 'var(--radius-md)',
      padding: '10px 14px',
      fontSize: '12px',
      boxShadow: 'var(--shadow-md)',
    }}>
      {payload.map(p => (
        <div key={p.name} style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '3px' }}>
          <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: p.color, flexShrink: 0 }} />
          <span style={{ color: 'var(--text-secondary)' }}>{p.name}：</span>
          <span style={{ color: 'var(--text-primary)', fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>
            ¥{Number(p.value).toLocaleString()}
          </span>
        </div>
      ))}
    </div>
  );
};

export default function Dashboard({ records = [], onNavigateToRecords, onOpenCreateModal }) {
  const stats = useMemo(() => {
    // 1. 已出货成交商品（已售出/已完成/交易成功）
    const soldRecords = records.filter(r => {
      const s = String(r.status || '').trim();
      return s === '已售出' || s === '已完成' || s === '交易成功';
    });

    // 2. 在手/自用资产（自用中/在售/待售）
    const inventoryRecords = records.filter(r => {
      const s = String(r.status || '').trim();
      return s === '自用中' || s === '待售中' || s === '在售' || s === '保值中';
    });

    const totalSales      = soldRecords.reduce((s, r) => s + (Number(r.sale_price) || 0), 0);
    const totalProfit     = soldRecords.reduce((s, r) => s + (Number(r.profit) || 0), 0);
    const totalCost       = soldRecords.reduce((s, r) => s + (Number(r.cost_price) || 0), 0);
    const inventoryValue  = inventoryRecords.reduce((s, r) => s + (Number(r.cost_price) || 0), 0);

    const margin    = totalSales > 0 ? (totalProfit / totalSales * 100).toFixed(1) : '0.0';
    const roi       = totalCost > 0  ? (totalProfit / totalCost * 100).toFixed(1) : '0.0';
    const avgProfit = soldRecords.length > 0 ? (totalProfit / soldRecords.length).toFixed(0) : '0';

    return {
      totalSales,
      totalProfit,
      totalCost,
      inventoryValue,
      margin,
      roi,
      avgProfit,
      soldCount: soldRecords.length,
      inventoryCount: inventoryRecords.length,
      soldRecords,
    };
  }, [records]);

  // Build chart data (last 10 sold records for clean profit trends)
  const chartData = useMemo(() => {
    const list = stats.soldRecords.length > 0 ? stats.soldRecords : records;
    return [...list].slice(0, 10).reverse().map((r, i) => ({
      name: r.title ? r.title.slice(0, 5) + (r.title.length > 5 ? '…' : '') : `T${i+1}`,
      收益: Number(r.profit) || 0,
      成交额: Number(r.sale_price) || 0,
    }));
  }, [stats.soldRecords, records]);

  const recentRecords = records.slice(0, 6);

  const fmt = (n) => n >= 10000
    ? (n / 10000).toFixed(2) + '万'
    : Number(n).toLocaleString('zh-CN', { minimumFractionDigits: 0 });

  return (
    <div className="page-enter" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '12px' }}>
        <div>
          <h1 style={{ fontSize: '20px', fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.03em', marginBottom: '4px' }}>
            经营看板
          </h1>
          <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
            共 {records.length} 笔账目 · {stats.soldCount} 笔已出货成交 · {stats.inventoryCount} 件自用在手
          </p>
        </div>
        <button className="btn-primary" onClick={onOpenCreateModal}>
          <Plus size={14} />
          新增记录
        </button>
      </div>

      {/* KPI Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: '12px' }}>
        <KpiCard
          label="累计出货流水"
          value={'¥' + fmt(stats.totalSales)}
          sub={`${stats.soldCount} 笔已成交订单`}
        />
        <KpiCard
          label="落袋净利润"
          value={'¥' + fmt(stats.totalProfit)}
          sub="变现净收益 (扣除成本运费)"
          accent
          trendUp={stats.totalProfit > 0}
          trend={stats.totalProfit}
        />
        <KpiCard
          label="综合毛利率"
          value={stats.margin + '%'}
          sub="已变现净利 / 成交额"
          trendUp={parseFloat(stats.margin) > 0}
          trend={0}
        />
        <KpiCard
          label="单笔平均收益"
          value={'¥' + fmt(stats.avgProfit)}
          sub="已出货订单均值"
        />
        <KpiCard
          label="在手/自用资产"
          value={'¥' + fmt(stats.inventoryValue)}
          sub={`${stats.inventoryCount} 件自用在手本金`}
        />
      </div>

      {/* Chart + Recent */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: '12px' }} className="lg-grid">
        {/* Area Chart */}
        <div className="card" style={{ padding: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
            <div>
              <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
                收益走势
              </div>
              <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '2px' }}>近期出货变现趋势</div>
            </div>
            <button
              className="btn-ghost"
              onClick={onNavigateToRecords}
              style={{ fontSize: '12px', color: 'var(--accent)', padding: '5px 8px', fontWeight: 600 }}
            >
              查看全部 <ArrowRight size={12} />
            </button>
          </div>

          <div style={{ height: '200px' }}>
            {chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ top: 4, right: 4, bottom: 0, left: -20 }}>
                  <defs>
                    <linearGradient id="profitGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="var(--accent)" stopOpacity={0.4} />
                      <stop offset="100%" stopColor="var(--accent)" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="salesGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="var(--success)" stopOpacity={0.15} />
                      <stop offset="100%" stopColor="var(--success)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="name" tick={{ fontSize: 11, fill: 'var(--text-tertiary)' }} tickLine={false} axisLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: 'var(--text-tertiary)' }} tickLine={false} axisLine={false} />
                  <Tooltip content={<CustomTooltip />} />
                  <Area type="monotone" dataKey="成交额" stroke="var(--success)" strokeWidth={1.5} fill="url(#salesGrad)" dot={false} />
                  <Area type="monotone" dataKey="收益"   stroke="var(--accent)" strokeWidth={2}   fill="url(#profitGrad)" dot={false} />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-tertiary)', fontSize: '13px' }}>
                暂无数据
              </div>
            )}
          </div>
        </div>

        {/* Recent Transactions */}
        <div className="card" style={{ padding: '20px', display: 'flex', flexDirection: 'column' }}>
          <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)', letterSpacing: '-0.02em', marginBottom: '14px' }}>
            最近交易
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', flex: 1 }}>
            {recentRecords.length > 0 ? recentRecords.map(r => (
              <div
                key={r.record_id}
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '9px 10px',
                  borderRadius: 'var(--radius-sm)',
                  transition: 'background 0.12s ease',
                  cursor: 'pointer',
                }}
                onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-hover)'}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
              >
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: '13px', color: 'var(--text-primary)', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {r.title}
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--text-tertiary)', marginTop: '2px' }}>
                    {r.category || '其他'}
                  </div>
                </div>
                <div style={{ textAlign: 'right', flexShrink: 0, marginLeft: '12px' }}>
                  <div style={{
                    fontSize: '13px', fontWeight: 600,
                    color: Number(r.profit) >= 0 ? 'var(--success)' : 'var(--danger)',
                    fontVariantNumeric: 'tabular-nums',
                  }}>
                    {Number(r.profit) >= 0 ? '+' : ''}¥{Number(r.profit).toLocaleString()}
                  </div>
                </div>
              </div>
            )) : (
              <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-tertiary)', fontSize: '13px' }}>
                暂无交易记录
              </div>
            )}
          </div>
        </div>
      </div>

      <style>{`
        @media (max-width: 900px) {
          .lg-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </div>
  );
}
