import React, { useState, useMemo } from 'react';
import {
  PieChart, Pie, Cell, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid,
} from 'recharts';
import { Calculator } from 'lucide-react';

const COLORS = ['var(--accent)', 'var(--success)', 'var(--warning)', 'var(--danger)', '#64748b'];

const CustomTooltip = ({ active, payload }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{
      background: 'var(--bg-surface)', border: '1px solid var(--border)',
      borderRadius: 'var(--radius-md)', padding: '10px 14px',
      fontSize: '12px', boxShadow: 'var(--shadow-md)',
    }}>
      {payload.map(p => (
        <div key={p.name} style={{ display: 'flex', gap: '8px', marginBottom: '2px', color: 'var(--text-secondary)' }}>
          <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{p.name}：</span>
          ¥{Number(p.value).toLocaleString()}
        </div>
      ))}
    </div>
  );
};

export default function ProfitAnalytics({ records = [] }) {
  const [salePrice,    setSalePrice]    = useState(1000);
  const [costPrice,    setCostPrice]    = useState(750);
  const [shippingFee,  setShippingFee]  = useState(12);
  const [feeRate,      setFeeRate]      = useState(0.6);

  const platformFee    = salePrice * (feeRate / 100);
  const simProfit      = salePrice - costPrice - shippingFee - platformFee;
  const simMargin      = salePrice > 0 ? (simProfit / salePrice * 100).toFixed(1) : '0.0';
  const simRoi         = costPrice > 0 ? (simProfit / costPrice * 100).toFixed(1) : '0.0';

  const categoryData = useMemo(() => {
    const map = {};
    records.forEach(r => {
      const cat = r.category || '其他';
      if (!map[cat]) map[cat] = { name: cat, profit: 0, sales: 0, count: 0 };
      map[cat].profit += Number(r.profit) || 0;
      map[cat].sales  += Number(r.sale_price) || 0;
      map[cat].count  += 1;
    });
    return Object.values(map).sort((a, b) => b.profit - a.profit);
  }, [records]);

  const QUICK_RATES = [0, 0.6, 1.0];

  return (
    <div className="page-enter" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Header */}
      <div>
        <h1 style={{ fontSize: '20px', fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.03em', marginBottom: '4px' }}>
          损益算盘
        </h1>
        <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
          交易扣点、运费测算与品类分析
        </p>
      </div>

      {/* Calculator */}
      <div className="card" style={{ padding: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
          <Calculator size={16} style={{ color: 'var(--accent)' }} />
          <span style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
            利润测算器
          </span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }} className="calc-grid">
          {/* Inputs */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {[
              { label: '拟定售价', value: salePrice, set: setSalePrice, prefix: '¥' },
              { label: '买入成本', value: costPrice, set: setCostPrice, prefix: '¥' },
              { label: '快递运费', value: shippingFee, set: setShippingFee, prefix: '¥' },
            ].map(({ label, value, set, prefix }) => (
              <div key={label}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 500, color: 'var(--text-secondary)', marginBottom: '5px' }}>
                  {label}
                </label>
                <div style={{ position: 'relative' }}>
                  <span style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', fontSize: '13px', color: 'var(--text-tertiary)', pointerEvents: 'none' }}>
                    {prefix}
                  </span>
                  <input
                    className="input"
                    type="number"
                    value={value}
                    onChange={e => set(Number(e.target.value))}
                    style={{ paddingLeft: '22px', fontVariantNumeric: 'tabular-nums' }}
                  />
                </div>
              </div>
            ))}

            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 500, color: 'var(--text-secondary)', marginBottom: '5px' }}>
                平台扣点
              </label>
              <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                <div style={{ position: 'relative', flex: 1 }}>
                  <input
                    className="input"
                    type="number"
                    step="0.1"
                    value={feeRate}
                    onChange={e => setFeeRate(Number(e.target.value))}
                    style={{ paddingRight: '28px', fontVariantNumeric: 'tabular-nums' }}
                  />
                  <span style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', fontSize: '12px', color: 'var(--text-tertiary)', pointerEvents: 'none' }}>%</span>
                </div>
                <div style={{ display: 'flex', gap: '4px' }}>
                  {QUICK_RATES.map(rate => (
                    <button
                      key={rate}
                      onClick={() => setFeeRate(rate)}
                      style={{
                        padding: '6px 10px', fontSize: '11px', fontWeight: 600,
                        borderRadius: 'var(--radius-sm)', cursor: 'pointer',
                        border: '1px solid',
                        transition: 'all 0.12s',
                        background: feeRate === rate ? 'var(--accent)' : 'var(--bg-subtle)',
                        color: feeRate === rate ? 'var(--accent-fg)' : 'var(--text-secondary)',
                        borderColor: feeRate === rate ? 'var(--accent)' : 'var(--border)',
                      }}
                    >
                      {rate}%
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Results */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div style={{ padding: '16px', borderRadius: 'var(--radius-md)', background: 'var(--accent-subtle)', border: '1px solid rgba(250,204,21,0.25)' }}>
              <div style={{ fontSize: '11px', color: 'var(--text-primary)', fontWeight: 600, marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                预估落袋纯利
              </div>
              <div style={{
                fontSize: '32px', fontWeight: 700, letterSpacing: '-0.05em',
                fontVariantNumeric: 'tabular-nums',
                color: simProfit >= 0 ? 'var(--success)' : 'var(--danger)',
                lineHeight: 1.1,
              }}>
                {simProfit >= 0 ? '+' : ''}¥{simProfit.toFixed(2)}
              </div>
            </div>

            {[
              { label: '平台手续费', value: `¥${platformFee.toFixed(2)}`, sub: `${feeRate}% × ¥${salePrice}` },
              { label: '净利润率',   value: `${simMargin}%`, sub: '净利 / 售价' },
              { label: '投资回报率', value: `${simRoi}%`,   sub: '净利 / 成本' },
            ].map(({ label, value, sub }) => (
              <div key={label} style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '12px 14px',
                borderRadius: 'var(--radius-md)',
                background: 'var(--bg-subtle)',
                border: '1px solid var(--border)',
              }}>
                <div>
                  <div style={{ fontSize: '12px', fontWeight: 500, color: 'var(--text-primary)' }}>{label}</div>
                  <div style={{ fontSize: '11px', color: 'var(--text-tertiary)', marginTop: '1px' }}>{sub}</div>
                </div>
                <div style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)', fontVariantNumeric: 'tabular-nums', letterSpacing: '-0.03em' }}>
                  {value}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Charts */}
      {categoryData.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }} className="chart-grid">
          {/* Bar chart */}
          <div className="card" style={{ padding: '20px' }}>
            <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)', letterSpacing: '-0.02em', marginBottom: '16px' }}>
              品类收益对比
            </div>
            <div style={{ height: '200px' }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={categoryData} margin={{ top: 4, right: 4, bottom: 0, left: -20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                  <XAxis dataKey="name" tick={{ fontSize: 11, fill: 'var(--text-tertiary)' }} tickLine={false} axisLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: 'var(--text-tertiary)' }} tickLine={false} axisLine={false} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="profit" name="净利润" fill="var(--accent)" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="sales"  name="成交额" fill="var(--success)" radius={[4, 4, 0, 0]} opacity={0.6} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Pie chart */}
          <div className="card" style={{ padding: '20px' }}>
            <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)', letterSpacing: '-0.02em', marginBottom: '16px' }}>
              品类利润分布
            </div>
            <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
              <div style={{ height: '160px', width: '160px', flexShrink: 0 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={categoryData}
                      cx="50%" cy="50%"
                      innerRadius={45} outerRadius={70}
                      paddingAngle={3}
                      dataKey="profit"
                    >
                      {categoryData.map((_, i) => (
                        <Cell key={i} fill={COLORS[i % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip content={<CustomTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {categoryData.slice(0, 4).map((d, i) => (
                  <div key={d.name} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px' }}>
                    <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: COLORS[i % COLORS.length], flexShrink: 0 }} />
                    <span style={{ color: 'var(--text-secondary)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{d.name}</span>
                    <span style={{ fontWeight: 600, color: 'var(--text-primary)', fontVariantNumeric: 'tabular-nums' }}>
                      ¥{d.profit.toLocaleString()}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @media (max-width: 700px) {
          .calc-grid  { grid-template-columns: 1fr !important; }
          .chart-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </div>
  );
}
