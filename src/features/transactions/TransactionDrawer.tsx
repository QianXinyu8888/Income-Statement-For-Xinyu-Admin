import { FormEvent, useEffect, useRef, useState } from 'react';
import { X } from 'lucide-react';
import {
  TRANSACTION_STATUSES,
  transactionSchema,
  type Transaction,
  type TransactionInput,
} from '../../domain/transaction';

const money = new Intl.NumberFormat('zh-CN', {
  style: 'currency',
  currency: 'CNY',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

type TransactionForm = Omit<TransactionInput, 'status'> & {
  status: TransactionInput['status'] | '';
};

const empty: TransactionForm = {
  title: '',
  salePrice: null,
  costPrice: null,
  shippingFee: null,
  status: '',
  purchaseDate: null,
  soldDate: null,
  sortOrder: null,
  note: null,
};

export function TransactionDrawer({
  record,
  open,
  saving,
  onClose,
  onSave,
  onDelete,
}: {
  record: Transaction | null;
  open: boolean;
  saving: boolean;
  onClose: () => void;
  onSave: (value: TransactionInput) => Promise<void>;
  onDelete?: () => Promise<void>;
}) {
  const [form, setForm] = useState<TransactionForm>(empty);
  const [error, setError] = useState('');
  const titleRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (open) {
      setForm(
        record
          ? {
              title: record.title ?? '',
              salePrice: record.salePrice,
              costPrice: record.costPrice,
              shippingFee: record.shippingFee,
              status: record.status ?? '',
              purchaseDate: record.purchaseDate,
              soldDate: record.soldDate,
              sortOrder: record.sortOrder,
              note: record.note,
            }
          : empty,
      );
      setError('');
      setTimeout(() => titleRef.current?.focus(), 0);
    }
  }, [open, record]);
  useEffect(() => {
    const close = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && open) onClose();
    };
    window.addEventListener('keydown', close);
    return () => window.removeEventListener('keydown', close);
  }, [open, onClose]);
  if (!open) return null;
  const set = <K extends keyof TransactionForm>(key: K, value: TransactionForm[K]) =>
    setForm((current) => ({ ...current, [key]: value }));
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const parsed = transactionSchema.safeParse(form);
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? '请检查输入');
      return;
    }
    try {
      await onSave(parsed.data);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : '保存失败');
    }
  };
  const estimatedTotalCost =
    form.costPrice === null || form.shippingFee === null ? null : form.costPrice + form.shippingFee;
  const estimatedProfit =
    form.salePrice === null || estimatedTotalCost === null
      ? null
      : form.salePrice - estimatedTotalCost;
  const visibleEstimatedProfit =
    form.status === '已售出' || form.status === '已退货' ? estimatedProfit : null;
  const displayedTotalCost = record ? record.totalCost : estimatedTotalCost;
  const actualProfit =
    record && (record.status === '已售出' || record.status === '已退货') ? record.profit : null;
  return (
    <div className="drawer-layer" role="presentation">
      <button className="drawer-backdrop" onClick={onClose} aria-label="关闭编辑面板" />
      <section className="drawer" role="dialog" aria-modal="true" aria-labelledby="drawer-title">
        <header>
          <div>
            <h2 id="drawer-title">{record ? '编辑交易' : '新增交易'}</h2>
            <p>
              {record
                ? actualProfit === null
                  ? '空字段将原样保存到飞书'
                  : `利润（飞书） ${money.format(actualProfit)}`
                : visibleEstimatedProfit === null
                  ? '空字段将原样保存到飞书'
                  : `预计利润 ${money.format(visibleEstimatedProfit)}`}
            </p>
          </div>
          <button className="icon-button" onClick={onClose} aria-label="关闭">
            <X size={18} />
          </button>
        </header>
        <form onSubmit={submit}>
          <label>
            商品名称
            <input
              ref={titleRef}
              value={form.title}
              onChange={(event) => set('title', event.target.value)}
              required
            />
          </label>
          <div className="form-grid">
            <label>
              状态
              <select
                value={form.status}
                onChange={(event) =>
                  set('status', event.target.value as TransactionInput['status'])
                }
              >
                <option value="" disabled>
                  请选择
                </option>
                {TRANSACTION_STATUSES.map((status) => (
                  <option key={status}>{status}</option>
                ))}
              </select>
            </label>
            <label>
              排序
              <input
                type="number"
                step="1"
                value={form.sortOrder ?? ''}
                onChange={(event) =>
                  set('sortOrder', event.target.value === '' ? null : Number(event.target.value))
                }
              />
            </label>
          </div>
          <div className="form-grid">
            <label>
              售价
              <input
                type="number"
                min="0"
                step="0.01"
                value={form.salePrice ?? ''}
                onChange={(event) =>
                  set('salePrice', event.target.value === '' ? null : Number(event.target.value))
                }
              />
            </label>
            <label>
              购入成本
              <input
                type="number"
                min="0"
                step="0.01"
                value={form.costPrice ?? ''}
                onChange={(event) =>
                  set('costPrice', event.target.value === '' ? null : Number(event.target.value))
                }
              />
            </label>
          </div>
          <div className="form-grid">
            <label>
              运费
              <input
                type="number"
                min="0"
                step="0.01"
                value={form.shippingFee ?? ''}
                onChange={(event) =>
                  set('shippingFee', event.target.value === '' ? null : Number(event.target.value))
                }
              />
            </label>
            <label>
              购入日期
              <input
                type="date"
                value={form.purchaseDate ?? ''}
                onChange={(event) => set('purchaseDate', event.target.value || null)}
              />
            </label>
            <label>
              售出日期
              <input
                type="date"
                value={form.soldDate ?? ''}
                onChange={(event) => set('soldDate', event.target.value || null)}
              />
            </label>
          </div>
          <div className="calculated-field">
            <span>{record ? '总成本（飞书）' : '预计总成本'}</span>
            <strong>{displayedTotalCost === null ? '—' : money.format(displayedTotalCost)}</strong>
            <small>{record ? '只读公式字段' : '保存后以飞书公式结果为准'}</small>
          </div>
          <label>
            备注
            <textarea
              rows={4}
              value={form.note ?? ''}
              onChange={(event) => set('note', event.target.value || null)}
            />
          </label>
          {error && (
            <div className="form-error" role="alert">
              {error}
            </div>
          )}
          <footer>
            {record && onDelete ? (
              <button
                type="button"
                className="button button--danger"
                onClick={onDelete}
                disabled={saving}
              >
                删除
              </button>
            ) : (
              <span />
            )}
            <div>
              <button type="button" className="button button--secondary" onClick={onClose}>
                取消
              </button>
              <button className="button button--primary" disabled={saving}>
                {saving ? '保存中…' : '保存'}
              </button>
            </div>
          </footer>
        </form>
      </section>
    </div>
  );
}
