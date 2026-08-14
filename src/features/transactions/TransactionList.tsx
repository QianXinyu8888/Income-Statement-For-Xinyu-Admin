import type { ReactNode } from 'react';
import type { EditableTransactionField, Transaction } from '../../domain/transaction';
import { StatusBadge } from '../../components/StatusBadge';
import {
  ALL_TRANSACTION_FIELDS,
  type TransactionFieldId,
} from '../../preferences/browser-preferences';

const money = new Intl.NumberFormat('zh-CN', {
  style: 'currency',
  currency: 'CNY',
  minimumFractionDigits: 2,
});
const display = (value: string | number | null) => value ?? '—';
const displayMoney = (value: number | null) => (value === null ? '—' : money.format(value));

interface Props {
  records: Transaction[];
  selected: Set<string>;
  visibleFields: TransactionFieldId[];
  focusedId?: string | null;
  onToggle: (id: string) => void;
  onOpen: (record: Transaction, field: EditableTransactionField) => void;
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

function EditableField({
  field,
  label,
  value,
  onClick,
  className = '',
  title,
  children,
}: {
  field: EditableTransactionField;
  label: string;
  value: string;
  onClick: () => void;
  className?: string;
  title?: string;
  children: ReactNode;
}) {
  const accessibleValue = value.length > 40 ? `${value.slice(0, 40)}…` : value;
  return (
    <button
      type="button"
      className={`editable-field ${className}`.trim()}
      data-edit-field={field}
      aria-label={`编辑${label}：${accessibleValue}`}
      title={title}
      onClick={onClick}
    >
      {children}
    </button>
  );
}

export function TransactionList({
  records,
  selected,
  visibleFields,
  focusedId,
  onToggle,
  onOpen,
}: Props) {
  const label = (record: Transaction) => record.title ?? '未命名交易';
  const showProfit = (record: Transaction) =>
    record.status === '已售出' || record.status === '已退货';
  const visible = new Set<TransactionFieldId>(['title', ...visibleFields]);
  const shows = (field: TransactionFieldId) => visible.has(field);
  const optionalCount = ALL_TRANSACTION_FIELDS.filter(
    (field) => field !== 'title' && visible.has(field),
  ).length;
  const tableMinWidth = Math.max(640, 362 + optionalCount * 118);
  const mobileDetailFields = ALL_TRANSACTION_FIELDS.filter(
    (field) => field !== 'title' && field !== 'status' && visible.has(field),
  );
  const hasMobileDetails = mobileDetailFields.length > 0;
  const wideMobileDetail =
    mobileDetailFields.length % 2 === 1 ? mobileDetailFields[mobileDetailFields.length - 1] : null;
  const mobileDetailClass = (field: TransactionFieldId) =>
    [
      'mobile-row__detail',
      field === 'note' && 'mobile-row__note',
      field === wideMobileDetail && 'mobile-row__detail--wide',
    ]
      .filter(Boolean)
      .join(' ');
  return (
    <>
      <div className="table-wrap desktop-list">
        <table aria-label="交易明细" style={{ minWidth: tableMinWidth }}>
          <thead>
            <tr>
              <th className="check-cell">
                <span className="sr-only">选择</span>
              </th>
              <th>商品名称</th>
              {shows('status') && <th>交易状态</th>}
              {shows('purchaseDate') && <th>购入日期</th>}
              {shows('soldDate') && <th>售出日期</th>}
              {shows('holdingDays') && <th className="number">持有天数</th>}
              {shows('costPrice') && <th className="number">购入成本</th>}
              {shows('shippingFee') && <th className="number">运费</th>}
              {shows('totalCost') && <th className="number">总成本</th>}
              {shows('salePrice') && <th className="number">成交价</th>}
              {shows('profit') && <th className="number">利润</th>}
              {shows('note') && <th>备注</th>}
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
                  <EditableField
                    field="title"
                    label="商品名称"
                    value={record.title ?? '空'}
                    className="row-title"
                    title={record.title ?? undefined}
                    onClick={() => onOpen(record, 'title')}
                  >
                    {record.title ?? '—'}
                  </EditableField>
                </td>
                {shows('status') && (
                  <td>
                    <EditableField
                      field="status"
                      label="交易状态"
                      value={record.status ?? '空'}
                      onClick={() => onOpen(record, 'status')}
                    >
                      <StatusBadge status={record.status} />
                    </EditableField>
                  </td>
                )}
                {shows('purchaseDate') && (
                  <td className="muted">
                    <EditableField
                      field="purchaseDate"
                      label="购入日期"
                      value={display(record.purchaseDate).toString()}
                      onClick={() => onOpen(record, 'purchaseDate')}
                    >
                      {display(record.purchaseDate)}
                    </EditableField>
                  </td>
                )}
                {shows('soldDate') && (
                  <td className="muted">
                    <EditableField
                      field="soldDate"
                      label="售出日期"
                      value={display(record.soldDate).toString()}
                      onClick={() => onOpen(record, 'soldDate')}
                    >
                      {display(record.soldDate)}
                    </EditableField>
                  </td>
                )}
                {shows('holdingDays') && (
                  <td className="number muted">
                    {record.holdingDays === null ? '—' : `${record.holdingDays} 天`}
                  </td>
                )}
                {shows('costPrice') && (
                  <td className="number muted">
                    <EditableField
                      field="costPrice"
                      label="购入成本"
                      value={displayMoney(record.costPrice)}
                      onClick={() => onOpen(record, 'costPrice')}
                    >
                      {displayMoney(record.costPrice)}
                    </EditableField>
                  </td>
                )}
                {shows('shippingFee') && (
                  <td className="number muted">
                    <EditableField
                      field="shippingFee"
                      label="运费"
                      value={displayMoney(record.shippingFee)}
                      onClick={() => onOpen(record, 'shippingFee')}
                    >
                      {displayMoney(record.shippingFee)}
                    </EditableField>
                  </td>
                )}
                {shows('totalCost') && (
                  <td className="number muted">{displayMoney(record.totalCost)}</td>
                )}
                {shows('salePrice') && (
                  <td className="number">
                    <EditableField
                      field="salePrice"
                      label="成交价"
                      value={displayMoney(record.salePrice)}
                      onClick={() => onOpen(record, 'salePrice')}
                    >
                      {displayMoney(record.salePrice)}
                    </EditableField>
                  </td>
                )}
                {shows('profit') && (
                  <td className="number">
                    <Profit value={record.profit} visible={showProfit(record)} />
                  </td>
                )}
                {shows('note') && (
                  <td className="note-cell">
                    <EditableField
                      field="note"
                      label="备注"
                      value={record.note || '空'}
                      onClick={() => onOpen(record, 'note')}
                    >
                      {record.note || '—'}
                    </EditableField>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="mobile-list" aria-label="移动端交易明细">
        {records.map((record) => (
          <article
            key={record.id}
            className={[
              'mobile-row',
              selected.has(record.id) && 'is-selected',
              !hasMobileDetails && 'mobile-row--compact',
            ]
              .filter(Boolean)
              .join(' ')}
            data-transaction-id={record.id}
            data-focused={focusedId === record.id || undefined}
          >
            <label className="mobile-row__check">
              <input
                type="checkbox"
                checked={selected.has(record.id)}
                onChange={() => onToggle(record.id)}
                aria-label={`选择 ${label(record)}`}
              />
            </label>
            <div className="mobile-row__content">
              <div className="mobile-row__heading">
                <EditableField
                  field="title"
                  label="商品名称"
                  value={record.title ?? '空'}
                  onClick={() => onOpen(record, 'title')}
                >
                  <strong>{record.title ?? '—'}</strong>
                </EditableField>
                {shows('status') && (
                  <span className="mobile-row__status">
                    <span className="sr-only">交易状态</span>
                    <EditableField
                      field="status"
                      label="交易状态"
                      value={record.status ?? '空'}
                      onClick={() => onOpen(record, 'status')}
                    >
                      <StatusBadge status={record.status} />
                    </EditableField>
                  </span>
                )}
              </div>
              {hasMobileDetails && (
                <dl className="mobile-row__details">
                  {shows('purchaseDate') && (
                    <div className={mobileDetailClass('purchaseDate')}>
                      <dt>购入日期</dt>
                      <dd>
                        <EditableField
                          field="purchaseDate"
                          label="购入日期"
                          value={display(record.purchaseDate).toString()}
                          onClick={() => onOpen(record, 'purchaseDate')}
                        >
                          {display(record.purchaseDate)}
                        </EditableField>
                      </dd>
                    </div>
                  )}
                  {shows('soldDate') && (
                    <div className={mobileDetailClass('soldDate')}>
                      <dt>售出日期</dt>
                      <dd>
                        <EditableField
                          field="soldDate"
                          label="售出日期"
                          value={display(record.soldDate).toString()}
                          onClick={() => onOpen(record, 'soldDate')}
                        >
                          {display(record.soldDate)}
                        </EditableField>
                      </dd>
                    </div>
                  )}
                  {shows('holdingDays') && (
                    <div className={mobileDetailClass('holdingDays')}>
                      <dt>持有天数</dt>
                      <dd>{record.holdingDays === null ? '—' : `${record.holdingDays} 天`}</dd>
                    </div>
                  )}
                  {shows('costPrice') && (
                    <div className={mobileDetailClass('costPrice')}>
                      <dt>购入成本</dt>
                      <dd>
                        <EditableField
                          field="costPrice"
                          label="购入成本"
                          value={displayMoney(record.costPrice)}
                          onClick={() => onOpen(record, 'costPrice')}
                        >
                          {displayMoney(record.costPrice)}
                        </EditableField>
                      </dd>
                    </div>
                  )}
                  {shows('shippingFee') && (
                    <div className={mobileDetailClass('shippingFee')}>
                      <dt>运费</dt>
                      <dd>
                        <EditableField
                          field="shippingFee"
                          label="运费"
                          value={displayMoney(record.shippingFee)}
                          onClick={() => onOpen(record, 'shippingFee')}
                        >
                          {displayMoney(record.shippingFee)}
                        </EditableField>
                      </dd>
                    </div>
                  )}
                  {shows('totalCost') && (
                    <div className={mobileDetailClass('totalCost')}>
                      <dt>总成本</dt>
                      <dd>{displayMoney(record.totalCost)}</dd>
                    </div>
                  )}
                  {shows('salePrice') && (
                    <div className={mobileDetailClass('salePrice')}>
                      <dt>成交价</dt>
                      <dd>
                        <EditableField
                          field="salePrice"
                          label="成交价"
                          value={displayMoney(record.salePrice)}
                          onClick={() => onOpen(record, 'salePrice')}
                        >
                          {displayMoney(record.salePrice)}
                        </EditableField>
                      </dd>
                    </div>
                  )}
                  {shows('profit') && (
                    <div className={mobileDetailClass('profit')}>
                      <dt>利润</dt>
                      <dd>
                        <Profit value={record.profit} visible={showProfit(record)} />
                      </dd>
                    </div>
                  )}
                  {shows('note') && (
                    <div className={mobileDetailClass('note')}>
                      <dt>备注</dt>
                      <dd>
                        <EditableField
                          field="note"
                          label="备注"
                          value={record.note || '空'}
                          onClick={() => onOpen(record, 'note')}
                        >
                          {record.note || '—'}
                        </EditableField>
                      </dd>
                    </div>
                  )}
                </dl>
              )}
            </div>
          </article>
        ))}
      </div>
    </>
  );
}
