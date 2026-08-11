import { ArrowDown, ArrowUp, ChevronsUpDown } from 'lucide-react';
import type { Transaction } from '../../domain/transaction';
import { StatusBadge } from '../../components/StatusBadge';

const money = new Intl.NumberFormat('zh-CN', {
  style: 'currency',
  currency: 'CNY',
  minimumFractionDigits: 2,
});
type SortKey =
  | 'soldDate'
  | 'purchaseDate'
  | 'title'
  | 'salePrice'
  | 'costPrice'
  | 'profit'
  | 'status'
  | 'sortOrder';

interface Props {
  records: Transaction[];
  selected: Set<string>;
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

function Profit({ value }: { value: number }) {
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
  onToggle,
  onOpen,
  onSort,
  sort,
  order,
}: Props) {
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
                <SortLabel field="title" label="商品" {...{ sort, order, onSort }} />
              </th>
              <th>
                <SortLabel field="status" label="状态" {...{ sort, order, onSort }} />
              </th>
              <th className="number">
                <SortLabel field="salePrice" label="售价" {...{ sort, order, onSort }} />
              </th>
              <th className="number">
                <SortLabel field="costPrice" label="成本" {...{ sort, order, onSort }} />
              </th>
              <th className="number">
                <SortLabel field="profit" label="利润" {...{ sort, order, onSort }} />
              </th>
              <th>
                <SortLabel field="soldDate" label="售出日期" {...{ sort, order, onSort }} />
              </th>
            </tr>
          </thead>
          <tbody>
            {records.map((record) => (
              <tr key={record.id} className={selected.has(record.id) ? 'is-selected' : ''}>
                <td className="check-cell">
                  <input
                    type="checkbox"
                    checked={selected.has(record.id)}
                    onChange={() => onToggle(record.id)}
                    aria-label={`选择 ${record.title}`}
                  />
                </td>
                <td>
                  <button className="row-title" onClick={() => onOpen(record)}>
                    {record.title}
                    <small>购入 {record.purchaseDate}</small>
                  </button>
                </td>
                <td>
                  <StatusBadge status={record.status} />
                </td>
                <td className="number">
                  {record.salePrice === null ? '—' : money.format(record.salePrice)}
                </td>
                <td className="number muted">{money.format(record.costPrice)}</td>
                <td className="number">
                  <Profit value={record.profit} />
                </td>
                <td className="muted">{record.soldDate ?? '—'}</td>
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
          >
            <input
              type="checkbox"
              checked={selected.has(record.id)}
              onChange={() => onToggle(record.id)}
              aria-label={`选择 ${record.title}`}
            />
            <button onClick={() => onOpen(record)}>
              <span className="mobile-row__top">
                <strong>{record.title}</strong>
                <StatusBadge status={record.status} />
              </span>
              <span className="mobile-row__bottom">
                <span>{record.salePrice === null ? '—' : money.format(record.salePrice)}</span>
                <Profit value={record.profit} />
                <time>{(record.soldDate ?? record.purchaseDate).slice(5)}</time>
              </span>
            </button>
          </article>
        ))}
      </div>
    </>
  );
}
