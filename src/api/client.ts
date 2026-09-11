import type { AnalyticsSummary } from '../domain/analytics';
import type { Transaction, TransactionInput, TransactionStatus } from '../domain/transaction';
import type { TransactionDateField } from '../domain/transaction-query';

interface ApiEnvelope<T> {
  data: T | null;
  error: { code: string; message: string } | null;
  requestId: string;
}

export class ApiError extends Error {
  constructor(
    message: string,
    public code: string,
    public status: number,
    public requestId?: string,
  ) {
    super(message);
  }
}

async function api<T>(path: string, init: RequestInit = {}): Promise<T> {
  const response = await fetch(`/api/v1${path}`, {
    credentials: 'same-origin',
    ...init,
    headers: init.body ? { 'Content-Type': 'application/json', ...init.headers } : init.headers,
  });
  let envelope: ApiEnvelope<T>;
  try {
    envelope = (await response.json()) as ApiEnvelope<T>;
  } catch {
    throw new ApiError('服务返回了无法识别的响应', 'INVALID_RESPONSE', response.status);
  }
  if (!response.ok || envelope.error || envelope.data === null) {
    throw new ApiError(
      envelope.error?.message ?? '请求失败',
      envelope.error?.code ?? 'REQUEST_FAILED',
      response.status,
      envelope.requestId,
    );
  }
  return envelope.data;
}

export interface User {
  username: string;
  role: string;
}
export interface TransactionPage {
  items: Transaction[];
  total: number;
  page: number;
  pageSize: number;
  warnings: string[];
}
export interface TransactionExport {
  items: Transaction[];
  total: number;
  warnings: string[];
}
export interface TransactionQuery {
  page: number;
  pageSize: number;
  q?: string;
  status?: TransactionStatus;
  dateField?: TransactionDateField;
  from?: string;
  to?: string;
  sort?: string;
  order?: 'asc' | 'desc';
  focusId?: string;
}

export const apiClient = {
  session: () => api<{ user: User }>('/auth/session'),
  login: (username: string, password: string) =>
    api<{ user: User }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    }),
  logout: () => api<{ success: boolean }>('/auth/logout', { method: 'POST' }),
  transactions: (query: TransactionQuery) =>
    api<TransactionPage>(
      `/transactions?${new URLSearchParams(
        Object.entries(query)
          .filter(([, value]) => value !== undefined && value !== '')
          .map(([key, value]) => [key, String(value)]),
      )}`,
    ),
  exportTransactions: () => api<TransactionExport>('/transactions/export'),
  createTransaction: (input: TransactionInput) =>
    api<Transaction>('/transactions', { method: 'POST', body: JSON.stringify(input) }),
  updateTransaction: (id: string, input: TransactionInput) =>
    api<Transaction>(`/transactions/${encodeURIComponent(id)}`, {
      method: 'PUT',
      body: JSON.stringify(input),
    }),
  deleteTransaction: (id: string) =>
    api<{ success: boolean }>(`/transactions/${encodeURIComponent(id)}`, { method: 'DELETE' }),
  batchStatus: (ids: string[], status: TransactionStatus) =>
    api<{ results: Array<{ id: string; success: boolean; message?: string }> }>(
      '/transactions/batch-status',
      { method: 'POST', body: JSON.stringify({ ids, status }) },
    ),
  batchDelete: (ids: string[]) =>
    api<{ results: Array<{ id: string; success: boolean; message?: string }> }>(
      '/transactions/batch-delete',
      { method: 'POST', body: JSON.stringify({ ids }) },
    ),
  summary: (from?: string, to?: string) => {
    const params = new URLSearchParams(
      Object.entries({ from, to })
        .filter(([, value]) => Boolean(value))
        .map(([key, value]) => [key, String(value)]),
    ).toString();
    return api<AnalyticsSummary>(`/analytics/summary${params ? `?${params}` : ''}`);
  },
  health: () => api<{ connected: boolean; checkedAt: string }>('/system/health'),
};
