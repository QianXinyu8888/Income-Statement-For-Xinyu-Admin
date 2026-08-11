import { useEffect, useId, useRef } from 'react';

export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel,
  pending = false,
  onCancel,
  onConfirm,
}: {
  open: boolean;
  title: string;
  description: string;
  confirmLabel: string;
  pending?: boolean;
  onCancel: () => void;
  onConfirm: () => void | Promise<void>;
}) {
  const titleId = useId();
  const descriptionId = useId();
  const cancelButton = useRef<HTMLButtonElement>(null);
  const confirmButton = useRef<HTMLButtonElement>(null);
  const cancelHandler = useRef(onCancel);
  const pendingValue = useRef(pending);
  const confirming = useRef(false);
  cancelHandler.current = onCancel;
  pendingValue.current = pending;

  useEffect(() => {
    if (!open) {
      confirming.current = false;
      return;
    }
    const previousFocus =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;
    cancelButton.current?.focus();
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !pendingValue.current) {
        event.preventDefault();
        event.stopPropagation();
        cancelHandler.current();
        return;
      }
      if (event.key !== 'Tab') return;
      const first = cancelButton.current;
      const last = confirmButton.current;
      if (!first || !last) return;
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
      document.removeEventListener('keydown', handleKey);
      previousFocus?.focus();
    };
  }, [open]);

  const confirm = async () => {
    if (pending || confirming.current) return;
    confirming.current = true;
    try {
      await onConfirm();
    } finally {
      confirming.current = false;
    }
  };

  if (!open) return null;
  return (
    <div
      className="confirm-layer"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !pending) onCancel();
      }}
    >
      <section
        className="confirm-dialog"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descriptionId}
      >
        <h2 id={titleId}>{title}</h2>
        <p id={descriptionId}>{description}</p>
        <div className="confirm-dialog__actions">
          <button
            ref={cancelButton}
            className="button button--secondary"
            onClick={onCancel}
            disabled={pending}
          >
            取消
          </button>
          <button
            ref={confirmButton}
            className="button button--danger"
            onClick={confirm}
            disabled={pending}
          >
            {pending ? `${confirmLabel}中…` : confirmLabel}
          </button>
        </div>
      </section>
    </div>
  );
}
