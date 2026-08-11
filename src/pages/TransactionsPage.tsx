import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Download, Filter, Plus, Search, SlidersHorizontal } from 'lucide-react';
import { apiClient, type TransactionQuery } from '../api/client';
import type { Transaction, TransactionInput, TransactionStatus } from '../domain/transaction';
import { TRANSACTION_STATUSES } from '../domain/transaction';
import { downloadCsv, downloadExcel } from '../domain/export';
import { ErrorState, LoadingState } from '../components/LoadingState';
import { TransactionList } from '../features/transactions/TransactionList';
import { TransactionDrawer } from '../features/transactions/TransactionDrawer';

export default function TransactionsPage() {
  const client = useQueryClient();
  const [query, setQuery] = useState<TransactionQuery>({
    page: 1,
    pageSize: 20,
    sort: 'soldDate',
    order: 'desc',
  });
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState(new Set<string>());
  const [editing, setEditing] = useState<Transaction | null>(null);
  const [drawer, setDrawer] = useState(false);
  const [moreFilters, setMoreFilters] = useState(false);
  const [notice, setNotice] = useState('');
  const result = useQuery({
    queryKey: ['transactions', query],
    queryFn: () => apiClient.transactions(query),
  });
  const invalidate = () => client.invalidateQueries({ queryKey: ['transactions'] });
  const save = useMutation({
    mutationFn: ({ record, input }: { record: Transaction | null; input: TransactionInput }) =>
      record ? apiClient.updateTransaction(record.id, input) : apiClient.createTransaction(input),
    onSuccess: async () => {
      await invalidate();
      setDrawer(false);
      setNotice('交易已保存');
    },
  });
  const remove = useMutation({
    mutationFn: (id: string) => apiClient.deleteTransaction(id),
    onSuccess: async () => {
      await invalidate();
      setDrawer(false);
      setNotice('交易已删除');
    },
  });
  const batchStatus = useMutation({
    mutationFn: (status: TransactionStatus) => apiClient.batchStatus([...selected], status),
    onSuccess: async ({ results }) => {
      const failed = results.filter((item) => !item.success).length;
      await invalidate();
      if (!failed) setSelected(new Set());
      setNotice(failed ? `${failed} 条记录更新失败，已保留选择` : '状态已更新');
    },
  });
  const batchDelete = useMutation({
    mutationFn: () => apiClient.batchDelete([...selected]),
    onSuccess: async ({ results }) => {
      const failed = results.filter((item) => !item.success).length;
      await invalidate();
      if (!failed) setSelected(new Set());
      setNotice(failed ? `${failed} 条记录删除失败，已保留选择` : '记录已删除');
    },
  });
  const records = useMemo(() => result.data?.items ?? [], [result.data?.items]);
  const monthProfit = useMemo(
    () =>
      records
        .filter(
          (record) =>
            record.soldDate?.startsWith(new Date().toISOString().slice(0, 7)) &&
            record.status === '已售出',
        )
        .reduce((sum, record) => sum + record.profit, 0),
    [records],
  );
  const open = (record: Transaction | null) => {
    setEditing(record);
    setDrawer(true);
  };
  const sort = (field: TransactionQuery['sort']) =>
    setQuery((current) => ({
      ...current,
      page: 1,
      sort: field,
      order: current.sort === field && current.order === 'desc' ? 'asc' : 'desc',
    }));
  const submitSearch = () => setQuery((current) => ({ ...current, page: 1, q: search }));
  return (
    <section className="page">
      <header className="page-header">
        <div>
          <div className="page-title-row">
            <h1>交易明细</h1>
            <span className="monthly-profit">
              本月利润 ¥{monthProfit.toLocaleString('zh-CN', { minimumFractionDigits: 2 })}
            </span>
          </div>
          <p>{result.data ? `共 ${result.data.total} 条记录` : '查找、记录和管理每一笔交易'}</p>
        </div>
        <button className="button button--primary" onClick={() => open(null)}>
          <Plus size={16} />
          新增交易
        </button>
      </header>
      <div className="toolbar">
        <div className="search-box">
          <Search size={16} />
          <input
            aria-label="搜索交易"
            placeholder="搜索交易"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') submitSearch();
            }}
          />
          <button onClick={submitSearch} aria-label="开始搜索">
            搜索
          </button>
        </div>
        <select
          aria-label="状态"
          value={query.status ?? ''}
          onChange={(event) =>
            setQuery((current) => ({
              ...current,
              page: 1,
              status: (event.target.value || undefined) as TransactionStatus | undefined,
            }))
          }
        >
          <option value="">全部状态</option>
          {TRANSACTION_STATUSES.map((status) => (
            <option key={status}>{status}</option>
          ))}
        </select>
        <input
          aria-label="开始日期"
          type="date"
          value={query.from ?? ''}
          onChange={(event) =>
            setQuery((current) => ({ ...current, page: 1, from: event.target.value || undefined }))
          }
        />
        <button
          className="button button--secondary filter-button"
          onClick={() => setMoreFilters(!moreFilters)}
        >
          <Filter size={15} />
          筛选
        </button>
        <div className="toolbar-spacer" />
        <button
          className="icon-button"
          title="导出 CSV"
          onClick={() => downloadCsv(records, '交易明细.csv')}
        >
          <Download size={17} />
          <span className="sr-only">导出 CSV</span>
        </button>
        <button
          className="icon-button"
          title="导出 Excel"
          onClick={() => downloadExcel(records, '交易明细.xlsx')}
        >
          <SlidersHorizontal size={17} />
          <span className="sr-only">导出 Excel</span>
        </button>
      </div>
      {moreFilters && (
        <div className="filter-panel">
          <label>
            结束日期
            <input
              type="date"
              value={query.to ?? ''}
              onChange={(event) =>
                setQuery((current) => ({
                  ...current,
                  page: 1,
                  to: event.target.value || undefined,
                }))
              }
            />
          </label>
          <button
            className="text-button"
            onClick={() => {
              setSearch('');
              setQuery({ page: 1, pageSize: 20, sort: 'soldDate', order: 'desc' });
            }}
          >
            重置筛选
          </button>
        </div>
      )}
      {result.isLoading ? (
        <LoadingState label="正在加载交易" />
      ) : result.isError ? (
        <ErrorState message={result.error.message} onRetry={() => result.refetch()} />
      ) : records.length === 0 ? (
        <div className="empty-state">
          <strong>没有找到交易</strong>
          <span>调整筛选条件，或新增第一笔交易。</span>
          <button className="button button--primary" onClick={() => open(null)}>
            新增交易
          </button>
        </div>
      ) : (
        <TransactionList
          records={records}
          selected={selected}
          onToggle={(id) =>
            setSelected((current) => {
              const next = new Set(current);
              if (next.has(id)) next.delete(id);
              else next.add(id);
              return next;
            })
          }
          onOpen={open}
          onSort={sort}
          sort={query.sort ?? 'soldDate'}
          order={query.order ?? 'desc'}
        />
      )}
      {result.data && result.data.total > result.data.pageSize && (
        <div className="pagination">
          <button
            className="button button--secondary"
            disabled={query.page === 1}
            onClick={() => setQuery((current) => ({ ...current, page: current.page - 1 }))}
          >
            上一页
          </button>
          <span>
            第 {query.page} / {Math.ceil(result.data.total / result.data.pageSize)} 页
          </span>
          <button
            className="button button--secondary"
            disabled={query.page >= Math.ceil(result.data.total / result.data.pageSize)}
            onClick={() => setQuery((current) => ({ ...current, page: current.page + 1 }))}
          >
            下一页
          </button>
        </div>
      )}
      {selected.size > 0 && (
        <div className="bulk-bar" role="region" aria-label="批量操作">
          <strong>已选 {selected.size} 条</strong>
          <div>
            {TRANSACTION_STATUSES.map((status) => (
              <button
                key={status}
                onClick={() => batchStatus.mutate(status)}
                disabled={batchStatus.isPending}
              >
                {status}
              </button>
            ))}
            <button
              className="danger-text"
              onClick={() => {
                if (window.confirm(`确定删除 ${selected.size} 条记录？`)) batchDelete.mutate();
              }}
              disabled={batchDelete.isPending}
            >
              删除
            </button>
          </div>
        </div>
      )}
      <TransactionDrawer
        record={editing}
        open={drawer}
        saving={save.isPending || remove.isPending}
        onClose={() => setDrawer(false)}
        onSave={(input) => save.mutateAsync({ record: editing, input }).then(() => undefined)}
        onDelete={
          editing
            ? async () => {
                if (window.confirm('确定删除这条交易？')) await remove.mutateAsync(editing.id);
              }
            : undefined
        }
      />
      {notice && (
        <button className="toast" onClick={() => setNotice('')} role="status">
          {notice}
        </button>
      )}
    </section>
  );
}
