import type { Transaction } from '../../domain/transaction';

const money = new Intl.NumberFormat('zh-CN', {
  style: 'currency',
  currency: 'CNY',
  minimumFractionDigits: 2,
});

function displayMoney(value: number | null) {
  return value === null ? '—' : money.format(value);
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
              <th scope="col">持有</th>
              <th scope="col">状态</th>
              <th scope="col">处理</th>
            </tr>
          </thead>
          <tbody>
            {records.map((record) => {
              const isListed = record.status === '在售中';
              const pending = listingId === record.id;
              return (
                <tr key={record.id} data-transaction-id={record.id}>
                  <td>
                    <button type="button" className="self-use-title" onClick={() => onOpen(record)}>
                      {title(record)}
                    </button>
                  </td>
                  <td>{displayMoney(record.totalCost)}</td>
                  <td>{record.holdingDays === null ? '—' : `${record.holdingDays} 天`}</td>
                  <td>
                    <span
                      className={`self-use-status self-use-status--${isListed ? 'listed' : 'personal'}`}
                    >
                      {record.status}
                    </span>
                  </td>
                  <td>
                    <div className="self-use-actions">
                      {showListedAction && (
                        <label className="self-use-check">
                          <input
                            type="checkbox"
                            aria-label={`标记 ${title(record)} 在售中`}
                            checked={isListed}
                            onChange={() => onMarkListed(record)}
                            disabled={pending || isListed}
                          />
                          <span>在售中</span>
                        </label>
                      )}
                      <label className="self-use-check">
                        <input
                          type="checkbox"
                          aria-label={`标记 ${title(record)} 已售出`}
                          checked={false}
                          onChange={() => onSell(record)}
                          disabled={pending}
                        />
                        <span>已售出</span>
                      </label>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <div className="self-use-mobile-list">
        {records.map((record) => {
          const isListed = record.status === '在售中';
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
                <div>
                  <dt>持有</dt>
                  <dd>{record.holdingDays === null ? '—' : `${record.holdingDays} 天`}</dd>
                </div>
              </dl>
              <div className="self-use-mobile-footer">
                <span
                  className={`self-use-status self-use-status--${isListed ? 'listed' : 'personal'}`}
                >
                  {record.status}
                </span>
                <div className="self-use-actions">
                  {showListedAction && (
                    <label className="self-use-check">
                      <input
                        type="checkbox"
                        aria-label={`标记 ${title(record)} 在售中`}
                        checked={isListed}
                        onChange={() => onMarkListed(record)}
                        disabled={pending || isListed}
                      />
                      <span>在售中</span>
                    </label>
                  )}
                  <label className="self-use-check">
                    <input
                      type="checkbox"
                      aria-label={`标记 ${title(record)} 已售出`}
                      checked={false}
                      onChange={() => onSell(record)}
                      disabled={pending}
                    />
                    <span>已售出</span>
                  </label>
                </div>
              </div>
            </article>
          );
        })}
      </div>
    </>
  );
}
