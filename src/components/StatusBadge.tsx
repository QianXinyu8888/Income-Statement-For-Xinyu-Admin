import type { TransactionStatus } from '../domain/transaction';

export function StatusBadge({ status }: { status: TransactionStatus | null }) {
  return status ? <span className={`status status--${status}`}>{status}</span> : <span>—</span>;
}
