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
  alternateStatus,
  onChangeStatus,
  onSell,
}: {
  record: Transaction;
  pending: boolean;
  alternateStatus: '在售中' | '自用中';
  onChangeStatus: (record: Transaction, nextStatus: '在售中' | '自用中') => void;
  onSell: (record: Transaction) => void;
}) {
  const title = record.title ?? '未命名物品';
  return (
    <div className="self-use-actions">
      <span className="self-use-action-label">设为</span>
      <button
        type="button"
        className="self-use-action self-use-action--listed"
        aria-label={`设置 ${title} 为${alternateStatus}`}
        onClick={() => onChangeStatus(record, alternateStatus)}
        disabled={pending}
      >
        {alternateStatus}
      </button>
      <button
        type="button"
        className="self-use-action self-use-action--sale"
        aria-label={`设置 ${title} 为已售出`}
        onClick={() => onSell(record)}
        disabled={pending}
      >
        已售出
      </button>
    </div>
  );
}

export function SelfUseList({
  records,
  listingId,
  alternateStatus,
  onChangeStatus,
  onSell,
  onOpen,
  showActions = true,
}: {
  records: Transaction[];
  listingId: string | null;
  alternateStatus?: '在售中' | '自用中';
  onChangeStatus?: (record: Transaction, nextStatus: '在售中' | '自用中') => void;
  onSell?: (record: Transaction) => void;
  onOpen: (record: Transaction) => void;
  showActions?: boolean;
}) {
  const title = (record: Transaction) => record.title ?? '未命名物品';
  return (
    <>
      <div className="self-use-table-wrap">
        <table className="self-use-table">
          <thead>
            <tr>
              <th scope="col">商品名称</th>
              <th scope="col">成本</th>
              <th scope="col" aria-label="状态设置" />
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
                    {showActions && alternateStatus && onChangeStatus && onSell ? (
                      <SelfUseActions
                        record={record}
                        pending={pending}
                        alternateStatus={alternateStatus}
                        onChangeStatus={onChangeStatus}
                        onSell={onSell}
                      />
                    ) : null}
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
                {showActions && alternateStatus && onChangeStatus && onSell ? (
                  <SelfUseActions
                    record={record}
                    pending={pending}
                    alternateStatus={alternateStatus}
                    onChangeStatus={onChangeStatus}
                    onSell={onSell}
                  />
                ) : null}
              </div>
            </article>
          );
        })}
      </div>
    </>
  );
}
