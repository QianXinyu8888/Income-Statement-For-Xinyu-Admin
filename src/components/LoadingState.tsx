export function LoadingState({ label = '正在加载' }: { label?: string }) {
  return (
    <div className="state" role="status">
      <span className="spinner" />
      {label}
    </div>
  );
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="state state--error" role="alert">
      <strong>加载失败</strong>
      <span>{message}</span>
      {onRetry && (
        <button className="button button--secondary" onClick={onRetry}>
          重试
        </button>
      )}
    </div>
  );
}
