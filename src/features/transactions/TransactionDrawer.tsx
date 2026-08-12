import { FormEvent, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import {
  TRANSACTION_STATUSES,
  transactionSchema,
  type EditableTransactionField,
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
  note: null,
};

export function TransactionDrawer({
  record,
  open,
  saving,
  initialFocus = 'title',
  onClose,
  onSave,
  onDelete,
}: {
  record: Transaction | null;
  open: boolean;
  saving: boolean;
  initialFocus?: EditableTransactionField;
  onClose: () => void;
  onSave: (value: TransactionInput) => Promise<void>;
  onDelete?: () => Promise<void>;
}) {
  const [form, setForm] = useState<TransactionForm>(empty);
  const [error, setError] = useState('');
  const fieldRefs = useRef<
    Partial<
      Record<EditableTransactionField, HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
    >
  >({});
  const dialogRef = useRef<HTMLElement>(null);
  const closeHandler = useRef(onClose);
  const savingValue = useRef(saving);
  closeHandler.current = onClose;
  savingValue.current = saving;
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
              note: record.note,
            }
          : empty,
      );
      setError('');
    }
  }, [open, record]);
  useEffect(() => {
    if (!open) return;
    const previousFocus =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const focusTimer = window.setTimeout(() => {
      if (document.querySelector('.confirm-layer')) return;
      const target = fieldRefs.current[initialFocus] ?? fieldRefs.current.title;
      target?.focus();
      if (
        target instanceof HTMLTextAreaElement ||
        (target instanceof HTMLInputElement && target.type === 'text')
      ) {
        target.setSelectionRange(target.value.length, target.value.length);
      }
    }, 0);
    const handleKey = (event: KeyboardEvent) => {
      if (document.querySelector('.confirm-layer')) return;
      if (event.key === 'Escape') {
        event.preventDefault();
        event.stopPropagation();
        if (!savingValue.current) closeHandler.current();
        return;
      }
      if (event.key !== 'Tab') return;
      const focusable = dialogRef.current?.querySelectorAll<HTMLElement>(
        'button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
      );
      if (!focusable?.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      } else if (!dialogRef.current?.contains(document.activeElement)) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener('keydown', handleKey);
    return () => {
      window.clearTimeout(focusTimer);
      document.removeEventListener('keydown', handleKey);
      document.body.style.overflow = previousOverflow;
      previousFocus?.focus();
    };
  }, [initialFocus, open]);
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
  return createPortal(
    <div className="drawer-layer" role="presentation">
      <button className="drawer-backdrop" onClick={onClose} aria-label="关闭编辑面板" />
      <section
        ref={dialogRef}
        className="drawer"
        role="dialog"
        aria-modal="true"
        aria-labelledby="drawer-title"
      >
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
              ref={(element) => {
                fieldRefs.current.title = element ?? undefined;
              }}
              value={form.title}
              onChange={(event) => set('title', event.target.value)}
              required
            />
          </label>
          <label>
            状态
            <select
              ref={(element) => {
                fieldRefs.current.status = element ?? undefined;
              }}
              value={form.status}
              onChange={(event) => set('status', event.target.value as TransactionInput['status'])}
            >
              <option value="" disabled>
                请选择
              </option>
              {TRANSACTION_STATUSES.map((status) => (
                <option key={status}>{status}</option>
              ))}
            </select>
          </label>
          <div className="form-grid">
            <label>
              售价
              <input
                ref={(element) => {
                  fieldRefs.current.salePrice = element ?? undefined;
                }}
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
                ref={(element) => {
                  fieldRefs.current.costPrice = element ?? undefined;
                }}
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
                ref={(element) => {
                  fieldRefs.current.shippingFee = element ?? undefined;
                }}
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
                ref={(element) => {
                  fieldRefs.current.purchaseDate = element ?? undefined;
                }}
                type="date"
                value={form.purchaseDate ?? ''}
                onChange={(event) => set('purchaseDate', event.target.value || null)}
              />
            </label>
            <label>
              售出日期
              <input
                ref={(element) => {
                  fieldRefs.current.soldDate = element ?? undefined;
                }}
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
              ref={(element) => {
                fieldRefs.current.note = element ?? undefined;
              }}
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
    </div>,
    document.body,
  );
}
