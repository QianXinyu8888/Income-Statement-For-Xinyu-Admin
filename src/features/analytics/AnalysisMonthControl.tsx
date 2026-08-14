interface AnalysisMonthControlProps {
  value: string;
  currentMonth: string;
  onChange: (month: string) => void;
  onReset: () => void;
}

export function AnalysisMonthControl({
  value,
  currentMonth,
  onChange,
  onReset,
}: AnalysisMonthControlProps) {
  return (
    <div className="analysis-month-control">
      <label htmlFor="analysis-month">分析月份</label>
      <input
        id="analysis-month"
        aria-label="分析月份"
        type="month"
        value={value}
        onChange={(event) => {
          if (event.target.value) onChange(event.target.value);
        }}
      />
      <button type="button" onClick={onReset} disabled={value === currentMonth}>
        重置为本月
      </button>
    </div>
  );
}
