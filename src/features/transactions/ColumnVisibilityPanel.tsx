import { useEffect, useId, useRef, useState } from 'react';
import { Columns3, X } from 'lucide-react';
import {
  ALL_TRANSACTION_FIELDS,
  type TransactionFieldId,
} from '../../preferences/browser-preferences';

const FIELD_LABELS: Record<TransactionFieldId, string> = {
  title: '商品名称',
  status: '交易状态',
  purchaseDate: '购入日期',
  soldDate: '售出日期',
  holdingDays: '持有天数',
  costPrice: '购入成本',
  shippingFee: '运费',
  totalCost: '总成本',
  salePrice: '成交价',
  profit: '利润',
  note: '备注',
};

interface Props {
  visibleFields: TransactionFieldId[];
  onFieldVisible: (field: TransactionFieldId, visible: boolean) => void;
  onReset: () => void;
}

export function ColumnVisibilityPanel({ visibleFields, onFieldVisible, onReset }: Props) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const panelId = useId();

  const close = () => {
    setOpen(false);
    triggerRef.current?.focus();
  };

  useEffect(() => {
    if (!open) return;
    panelRef.current
      ?.querySelector<HTMLInputElement>('input[type="checkbox"]:not(:disabled)')
      ?.focus();

    const handlePointerDown = (event: PointerEvent) => {
      if (rootRef.current?.contains(event.target as Node)) return;
      event.preventDefault();
      close();
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      event.preventDefault();
      close();
    };
    document.addEventListener('pointerdown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [open]);

  return (
    <div className="column-visibility" ref={rootRef}>
      <button
        ref={triggerRef}
        type="button"
        className="button button--secondary column-visibility__trigger"
        aria-label="选择显示字段"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((value) => !value)}
      >
        <Columns3 size={16} aria-hidden="true" />列
      </button>
      {open && (
        <div
          ref={panelRef}
          id={panelId}
          className="column-visibility__panel"
          role="dialog"
          aria-label="显示字段"
        >
          <div className="column-visibility__header">
            <strong>显示字段</strong>
            <button
              type="button"
              className="column-visibility__close"
              aria-label="关闭字段选择"
              onClick={close}
            >
              <X size={16} aria-hidden="true" />
            </button>
          </div>
          <div className="column-visibility__fields">
            {ALL_TRANSACTION_FIELDS.map((field) => (
              <label key={field} className="column-visibility__field">
                <input
                  type="checkbox"
                  checked={field === 'title' || visibleFields.includes(field)}
                  disabled={field === 'title'}
                  onChange={(event) => onFieldVisible(field, event.target.checked)}
                />
                <span>{FIELD_LABELS[field]}</span>
              </label>
            ))}
          </div>
          <button
            type="button"
            className="button button--secondary column-visibility__reset"
            onClick={onReset}
          >
            恢复默认列
          </button>
        </div>
      )}
    </div>
  );
}
