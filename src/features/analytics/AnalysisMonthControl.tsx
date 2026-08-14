import { useEffect, useId, useRef, useState } from 'react';
import { CalendarDays, ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react';

interface AnalysisMonthControlProps {
  value: string;
  currentMonth: string;
  onChange: (month: string) => void;
  onReset: () => void;
}

const months = Array.from({ length: 12 }, (_, index) => index + 1);

function yearFromMonth(value: string) {
  return Number(value.slice(0, 4));
}

function formatMonth(value: string) {
  const [year, month] = value.split('-').map(Number);
  return `${year} 年 ${month} 月`;
}

export function AnalysisMonthControl({
  value,
  currentMonth,
  onChange,
  onReset,
}: AnalysisMonthControlProps) {
  const dialogId = useId();
  const dialogTitleId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const selectedMonthRef = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);
  const [displayYear, setDisplayYear] = useState(() => yearFromMonth(value));

  const selectedYear = yearFromMonth(value);
  const selectedMonth = Number(value.slice(5, 7));
  const currentYear = yearFromMonth(currentMonth);
  const currentMonthNumber = Number(currentMonth.slice(5, 7));

  function closeAndRestoreFocus() {
    setOpen(false);
    triggerRef.current?.focus();
  }

  useEffect(() => {
    if (!open) return;

    selectedMonthRef.current?.focus();

    function handleDocumentClick(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) closeAndRestoreFocus();
    }

    function handleDocumentKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') closeAndRestoreFocus();
    }

    document.addEventListener('click', handleDocumentClick);
    document.addEventListener('keydown', handleDocumentKeyDown);
    return () => {
      document.removeEventListener('click', handleDocumentClick);
      document.removeEventListener('keydown', handleDocumentKeyDown);
    };
  }, [open]);

  function selectMonth(month: number) {
    onChange(`${displayYear}-${String(month).padStart(2, '0')}`);
    closeAndRestoreFocus();
  }

  function resetToCurrentMonth() {
    onReset();
    closeAndRestoreFocus();
  }

  return (
    <div className="analysis-month-control" ref={rootRef}>
      <button
        ref={triggerRef}
        className="analysis-month-trigger"
        type="button"
        aria-label={`选择分析月份，当前为 ${formatMonth(value)}`}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls={open ? dialogId : undefined}
        onClick={() => {
          if (open) {
            closeAndRestoreFocus();
            return;
          }
          setDisplayYear(selectedYear);
          setOpen(true);
        }}
      >
        <CalendarDays size={17} aria-hidden="true" />
        <span>{formatMonth(value)}</span>
        <ChevronDown size={16} aria-hidden="true" />
      </button>

      {open && (
        <div
          id={dialogId}
          className="analysis-month-popover"
          role="dialog"
          aria-modal="false"
          aria-labelledby={dialogTitleId}
        >
          <h2 className="sr-only" id={dialogTitleId}>
            选择分析月份
          </h2>
          <div className="analysis-month-popover__year">
            <button
              type="button"
              aria-label="上一年"
              onClick={() => setDisplayYear((year) => year - 1)}
            >
              <ChevronLeft size={18} aria-hidden="true" />
            </button>
            <strong>{displayYear} 年</strong>
            <button
              type="button"
              aria-label="下一年"
              onClick={() => setDisplayYear((year) => year + 1)}
            >
              <ChevronRight size={18} aria-hidden="true" />
            </button>
          </div>

          <div className="analysis-month-popover__months">
            {months.map((month) => {
              const selected = displayYear === selectedYear && month === selectedMonth;
              const current = displayYear === currentYear && month === currentMonthNumber;
              return (
                <button
                  ref={selected ? selectedMonthRef : undefined}
                  className={selected ? 'is-selected' : undefined}
                  type="button"
                  key={month}
                  aria-label={`选择 ${displayYear} 年 ${month} 月`}
                  aria-pressed={selected}
                  aria-current={current ? 'date' : undefined}
                  onClick={() => selectMonth(month)}
                >
                  <span>{month} 月</span>
                  {current && <small>本月</small>}
                </button>
              );
            })}
          </div>

          <div className="analysis-month-popover__footer">
            <button type="button" onClick={resetToCurrentMonth}>
              回到本月
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
