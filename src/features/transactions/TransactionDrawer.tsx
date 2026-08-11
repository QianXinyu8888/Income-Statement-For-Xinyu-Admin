import { FormEvent, useEffect, useRef, useState } from 'react';
import { X } from 'lucide-react';
import {
  TRANSACTION_STATUSES,
  transactionSchema,
  type Transaction,
  type TransactionInput,
} from '../../domain/transaction';

const today = () => new Date().toISOString().slice(0, 10);
const empty: TransactionInput = {
  title: '',
  category: '3C数码',
  salePrice: 0,
  costPrice: 0,
  shippingFee: 0,
  status: '已售出',
  transactionDate: today(),
  note: '',
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
  const [form, setForm] = useState<TransactionInput>(empty);
  const [error, setError] = useState('');
  const titleRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (open) {
      setForm(
        record
          ? {
              title: record.title,
              category: record.category,
              salePrice: record.salePrice,
              costPrice: record.costPrice,
              shippingFee: record.shippingFee,
              status: record.status,
              transactionDate: record.transactionDate,
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
  const set = <K extends keyof TransactionInput>(key: K, value: TransactionInput[K]) =>
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
  const profit =
    form.salePrice === null ? null : form.salePrice - form.costPrice - form.shippingFee;
  return (
    <div className="drawer-layer" role="presentation">
      <button className="drawer-backdrop" onClick={onClose} aria-label="关闭编辑面板" />
      <section className="drawer" role="dialog" aria-modal="true" aria-labelledby="drawer-title">
        <header>
          <div>
            <h2 id="drawer-title">{record ? '编辑交易' : '新增交易'}</h2>
            <p>{profit === null ? '自用记录不计入销售额' : `预计利润 ¥${profit.toFixed(2)}`}</p>
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
              分类
              <input
                value={form.category}
                onChange={(event) => set('category', event.target.value)}
                required
              />
            </label>
            <label>
              状态
              <select
                value={form.status}
                onChange={(event) =>
                  set('status', event.target.value as TransactionInput['status'])
                }
              >
                {TRANSACTION_STATUSES.map((status) => (
                  <option key={status}>{status}</option>
                ))}
              </select>
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
              成本
              <input
                type="number"
                min="0"
                step="0.01"
                value={form.costPrice}
                onChange={(event) => set('costPrice', Number(event.target.value))}
                required
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
                value={form.shippingFee}
                onChange={(event) => set('shippingFee', Number(event.target.value))}
                required
              />
            </label>
            <label>
              交易日期
              <input
                type="date"
                value={form.transactionDate}
                onChange={(event) => set('transactionDate', event.target.value)}
                required
              />
            </label>
          </div>
          <label>
            备注
            <textarea
              rows={4}
              value={form.note}
              onChange={(event) => set('note', event.target.value)}
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
