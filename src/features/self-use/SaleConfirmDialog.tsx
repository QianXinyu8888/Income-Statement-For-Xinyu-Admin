import { useEffect, useRef, useState, type FormEvent } from 'react';
import { createPortal } from 'react-dom';
import type { Transaction } from '../../domain/transaction';
import { previewProfit, type SaleValues } from '../../domain/self-use';

const money = new Intl.NumberFormat('zh-CN', {
  style: 'currency',
  currency: 'CNY',
  minimumFractionDigits: 2,
});

function localDate() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(
    now.getDate(),
  ).padStart(2, '0')}`;
}

function profitText(value: number | null) {
  if (value === null) return '—';
  return `${value >= 0 ? '+' : ''}${money.format(value)}`;
}

export function SaleConfirmDialog({
  record,
  open,
  saving,
  onClose,
  onConfirm,
}: {
  record: Transaction | null;
  open: boolean;
  saving: boolean;
  onClose: () => void;
  onConfirm: (values: SaleValues) => Promise<void>;
}) {
  const [salePrice, setSalePrice] = useState('');
  const [soldDate, setSoldDate] = useState(localDate);
  const [note, setNote] = useState('');
  const [error, setError] = useState('');
  const dialogRef = useRef<HTMLElement>(null);
  const priceRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open || !record) return;
    setSalePrice('');
    setSoldDate(localDate());
    setNote(record.note ?? '');
    setError('');
  }, [open, record]);

  useEffect(() => {
    if (!open) return;
    const previousFocus =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const focusTimer = window.setTimeout(() => priceRef.current?.focus(), 0);
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !saving) {
        event.preventDefault();
        onClose();
        return;
      }
      if (event.key !== 'Tab') return;
      const focusable = dialogRef.current?.querySelectorAll<HTMLElement>(
        'button:not([disabled]), input:not([disabled]), textarea:not([disabled])',
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
      }
    };
    document.addEventListener('keydown', handleKey);
    return () => {
      window.clearTimeout(focusTimer);
      document.removeEventListener('keydown', handleKey);
      document.body.style.overflow = previousOverflow;
      previousFocus?.focus();
    };
  }, [onClose, open, saving]);

  if (!open || !record) return null;

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!salePrice.trim()) {
      setError('请输入售价');
      return;
    }
    const parsedPrice = Number(salePrice);
    if (!Number.isFinite(parsedPrice) || parsedPrice < 0) {
      setError('请输入有效售价');
      return;
    }
    if (!soldDate) {
      setError('请输入售出日期');
      return;
    }
    setError('');
    try {
      await onConfirm({ salePrice: parsedPrice, soldDate, note });
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : '保存失败');
    }
  };

  const profit = previewProfit(salePrice === '' ? null : Number(salePrice), record.totalCost);
  return createPortal(
    <div className="sale-dialog-layer" role="presentation">
      <button
        type="button"
        className="sale-dialog-backdrop"
        onClick={onClose}
        aria-label="关闭售出确认窗口"
        disabled={saving}
      />
      <section
        ref={dialogRef}
        className="sale-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="sale-dialog-title"
      >
        <header className="sale-dialog__titlebar">
          <span>标记为已售出</span>
        </header>
        <form onSubmit={submit}>
          <div className="sale-dialog__content">
            <h2 id="sale-dialog-title">确认售出</h2>
            <p>
              今天是你自用 {record.title ?? '该物品'} 的第 {record.holdingDays ?? '—'} 天
            </p>
            <label>
              售价 <em>*</em>
              <span className="sale-dialog__money-input">
                <b>¥</b>
                <input
                  ref={priceRef}
                  aria-label="售价"
                  type="number"
                  min="0"
                  step="0.01"
                  value={salePrice}
                  onChange={(event) => setSalePrice(event.target.value)}
                  disabled={saving}
                />
              </span>
            </label>
            <label>
              售出日期 <em>*</em>
              <input
                aria-label="售出日期"
                type="date"
                value={soldDate}
                onChange={(event) => setSoldDate(event.target.value)}
                disabled={saving}
              />
            </label>
            <label>
              备注
              <textarea
                aria-label="备注"
                rows={2}
                value={note}
                onChange={(event) => setNote(event.target.value)}
                disabled={saving}
              />
            </label>
            <div className="sale-dialog__profit" aria-live="polite">
              <span>利润</span>
              <strong className={profit === null ? '' : profit >= 0 ? 'profit' : 'loss'}>
                {profitText(profit)}
              </strong>
            </div>
            {error && (
              <div className="form-error" role="alert">
                {error}
              </div>
            )}
          </div>
          <footer>
            <button
              type="button"
              className="button button--secondary"
              onClick={onClose}
              disabled={saving}
            >
              取消
            </button>
            <button className="button sale-dialog__confirm" disabled={saving}>
              {saving ? '保存中…' : '确认售出'}
            </button>
          </footer>
        </form>
      </section>
    </div>,
    document.body,
  );
}
