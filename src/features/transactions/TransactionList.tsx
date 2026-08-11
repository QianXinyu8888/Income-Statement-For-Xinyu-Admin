import { ArrowDown, ArrowUp, ChevronsUpDown } from 'lucide-react';
import type { Transaction } from '../../domain/transaction';
import { StatusBadge } from '../../components/StatusBadge';

const money = new Intl.NumberFormat('zh-CN', {
  style: 'currency',
  currency: 'CNY',
  minimumFractionDigits: 2,
});
const display = (value: string | number | null) => value ?? '—';
const displayMoney = (value: number | null) => (value === null ? '—' : money.format(value));

type SortKey =
  | 'soldDate'
  | 'purchaseDate'
  | 'title'
  | 'salePrice'
  | 'costPrice'
  | 'totalCost'
  | 'profit'
  | 'status';

interface Props {
  records: Transaction[];
  selected: Set<string>;
  focusedId?: string | null;
  onToggle: (id: string) => void;
  onOpen: (record: Transaction) => void;
  onSort: (key: SortKey) => void;
  sort: string;
  order: 'asc' | 'desc';
}

function SortLabel({
  field,
  label,
  sort,
  order,
  onSort,
}: {
  field: SortKey;
  label: string;
  sort: string;
  order: string;
  onSort: (key: SortKey) => void;
}) {
  const Icon = sort !== field ? ChevronsUpDown : order === 'asc' ? ArrowUp : ArrowDown;
  return (
    <button className="sort-button" onClick={() => onSort(field)}>
      {label}
      <Icon size={13} />
    </button>
  );
}

function Profit({ value, visible }: { value: number | null; visible: boolean }) {
  if (!visible || value === null) return <>—</>;
  return (
    <span className={value >= 0 ? 'profit' : 'loss'}>
      {value >= 0 ? '+' : ''}
      {money.format(value)}
    </span>
  );
}

export function TransactionList({
  records,
  selected,
  focusedId,
  onToggle,
  onOpen,
  onSort,
  sort,
  order,
}: Props) {
  const label = (record: Transaction) => record.title ?? '未命名交易';
  const showProfit = (record: Transaction) =>
    record.status === '已售出' || record.status === '已退货';
  return (
    <>
      <div className="table-wrap desktop-list">
        <table aria-label="交易明细">
          <thead>
            <tr>
              <th className="check-cell">
                <span className="sr-only">选择</span>
              </th>
              <th>
                <SortLabel field="title" label="商品名称" {...{ sort, order, onSort }} />
              </th>
              <th>
                <SortLabel field="status" label="交易状态" {...{ sort, order, onSort }} />
              </th>
              <th>
                <SortLabel field="purchaseDate" label="购入日期" {...{ sort, order, onSort }} />
              </th>
              <th>
                <SortLabel field="soldDate" label="售出日期" {...{ sort, order, onSort }} />
              </th>
              <th className="number">持有天数</th>
              <th className="number">
                <SortLabel field="costPrice" label="购入成本" {...{ sort, order, onSort }} />
              </th>
              <th className="number">运费</th>
              <th className="number">
                <SortLabel field="totalCost" label="总成本" {...{ sort, order, onSort }} />
              </th>
              <th className="number">
                <SortLabel field="salePrice" label="成交价" {...{ sort, order, onSort }} />
              </th>
              <th className="number">
                <SortLabel field="profit" label="利润" {...{ sort, order, onSort }} />
              </th>
              <th>备注</th>
            </tr>
          </thead>
          <tbody>
            {records.map((record) => (
              <tr
                key={record.id}
                className={selected.has(record.id) ? 'is-selected' : ''}
                data-transaction-id={record.id}
                data-focused={focusedId === record.id || undefined}
              >
                <td className="check-cell">
                  <input
                    type="checkbox"
                    checked={selected.has(record.id)}
                    onChange={() => onToggle(record.id)}
                    aria-label={`选择 ${label(record)}`}
                  />
                </td>
                <td className="product-cell">
                  <button className="row-title" onClick={() => onOpen(record)}>
                    {record.title ?? '—'}
                  </button>
                </td>
                <td>
                  <StatusBadge status={record.status} />
                </td>
                <td className="muted">{display(record.purchaseDate)}</td>
                <td className="muted">{display(record.soldDate)}</td>
                <td className="number muted">
                  {record.holdingDays === null ? '—' : `${record.holdingDays} 天`}
                </td>
                <td className="number muted">{displayMoney(record.costPrice)}</td>
                <td className="number muted">{displayMoney(record.shippingFee)}</td>
                <td className="number muted">{displayMoney(record.totalCost)}</td>
                <td className="number">{displayMoney(record.salePrice)}</td>
                <td className="number">
                  <Profit value={record.profit} visible={showProfit(record)} />
                </td>
                <td className="note-cell">{record.note || '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="mobile-list" aria-label="移动端交易明细">
        {records.map((record) => (
          <article
            key={record.id}
            className={selected.has(record.id) ? 'mobile-row is-selected' : 'mobile-row'}
            data-transaction-id={record.id}
            data-focused={focusedId === record.id || undefined}
          >
            <input
              type="checkbox"
              checked={selected.has(record.id)}
              onChange={() => onToggle(record.id)}
              aria-label={`选择 ${label(record)}`}
            />
            <div className="mobile-row__content">
              <button className="mobile-row__heading" onClick={() => onOpen(record)}>
                <strong>{record.title ?? '—'}</strong>
                <span className="mobile-row__status">
                  <span className="sr-only">交易状态</span>
                  <StatusBadge status={record.status} />
                </span>
              </button>
              <dl className="mobile-row__details">
                <div>
                  <dt>购入日期</dt>
                  <dd>{display(record.purchaseDate)}</dd>
                </div>
                <div>
                  <dt>售出日期</dt>
                  <dd>{display(record.soldDate)}</dd>
                </div>
                <div>
                  <dt>持有天数</dt>
                  <dd>{record.holdingDays === null ? '—' : `${record.holdingDays} 天`}</dd>
                </div>
                <div>
                  <dt>购入成本</dt>
                  <dd>{displayMoney(record.costPrice)}</dd>
                </div>
                <div>
                  <dt>运费</dt>
                  <dd>{displayMoney(record.shippingFee)}</dd>
                </div>
                <div>
                  <dt>总成本</dt>
                  <dd>{displayMoney(record.totalCost)}</dd>
                </div>
                <div>
                  <dt>成交价</dt>
                  <dd>{displayMoney(record.salePrice)}</dd>
                </div>
                <div>
                  <dt>利润</dt>
                  <dd>
                    <Profit value={record.profit} visible={showProfit(record)} />
                  </dd>
                </div>
                <div className="mobile-row__note">
                  <dt>备注</dt>
                  <dd>{record.note || '—'}</dd>
                </div>
              </dl>
            </div>
          </article>
        ))}
      </div>
    </>
  );
}
