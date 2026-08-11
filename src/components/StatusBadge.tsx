import type { TransactionStatus } from '../domain/transaction';

export function StatusBadge({ status }: { status: TransactionStatus }) {
  return <span className={`status status--${status}`}>{status}</span>;
}
