import { BadgeCheck, CircleDollarSign } from 'lucide-react';
import type { Transaction } from '../../domain/transaction';

const money = new Intl.NumberFormat('zh-CN', {
  style: 'currency',
  currency: 'CNY',
  minimumFractionDigits: 2,
});

function displayMoney(value: number | null) {
  return value === null ? '—' : money.format(value);
}

function SelfUseActions({
  record,
  pending,
  showListedAction,
  onMarkListed,
  onSell,
}: {
  record: Transaction;
  pending: boolean;
  showListedAction: boolean;
  onMarkListed: (record: Transaction) => void;
  onSell: (record: Transaction) => void;
}) {
  const title = record.title ?? '未命名物品';
  return (
    <div className="self-use-actions">
      {showListedAction && (
        <button
          type="button"
          className="self-use-action"
          aria-label={`标记 ${title} 为在售中`}
          onClick={() => onMarkListed(record)}
          disabled={pending}
        >
          <BadgeCheck size={14} aria-hidden="true" />
          <span>在售中</span>
        </button>
      )}
      <button
        type="button"
        className="self-use-action self-use-action--sale"
        aria-label={`确认出售 ${title}`}
        onClick={() => onSell(record)}
        disabled={pending}
      >
        <CircleDollarSign size={14} aria-hidden="true" />
        <span>售出…</span>
      </button>
    </div>
  );
}

export function SelfUseList({
  records,
  listingId,
  onMarkListed,
  onSell,
  onOpen,
  showListedAction = true,
}: {
  records: Transaction[];
  listingId: string | null;
  onMarkListed: (record: Transaction) => void;
  onSell: (record: Transaction) => void;
  onOpen: (record: Transaction) => void;
  showListedAction?: boolean;
}) {
  const title = (record: Transaction) => record.title ?? '未命名物品';
  return (
    <>
      <div className="self-use-table-wrap">
        <table className="self-use-table">
          <thead>
            <tr>
              <th scope="col">物品</th>
              <th scope="col">成本</th>
              <th scope="col">处理</th>
            </tr>
          </thead>
          <tbody>
            {records.map((record) => {
              const pending = listingId === record.id;
              return (
                <tr key={record.id} data-transaction-id={record.id}>
                  <td>
                    <button type="button" className="self-use-title" onClick={() => onOpen(record)}>
                      {title(record)}
                    </button>
                  </td>
                  <td>{displayMoney(record.totalCost)}</td>
                  <td>
                    <SelfUseActions
                      record={record}
                      pending={pending}
                      showListedAction={showListedAction}
                      onMarkListed={onMarkListed}
                      onSell={onSell}
                    />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <div className="self-use-mobile-list">
        {records.map((record) => {
          const pending = listingId === record.id;
          return (
            <article key={record.id} className="self-use-mobile-card">
              <button type="button" className="self-use-title" onClick={() => onOpen(record)}>
                {title(record)}
              </button>
              <dl>
                <div>
                  <dt>成本</dt>
                  <dd>{displayMoney(record.totalCost)}</dd>
                </div>
              </dl>
              <div className="self-use-mobile-footer">
                <SelfUseActions
                  record={record}
                  pending={pending}
                  showListedAction={showListedAction}
                  onMarkListed={onMarkListed}
                  onSell={onSell}
                />
              </div>
            </article>
          );
        })}
      </div>
    </>
  );
}
