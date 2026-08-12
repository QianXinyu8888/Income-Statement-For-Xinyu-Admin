import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Download, Filter, Plus, Search, SlidersHorizontal } from 'lucide-react';
import { useSearchParams } from 'react-router-dom';
import { apiClient, type TransactionQuery } from '../api/client';
import type { Transaction, TransactionInput, TransactionStatus } from '../domain/transaction';
import { TRANSACTION_STATUSES } from '../domain/transaction';
import { downloadCsv, downloadExcel } from '../domain/export';
import { ErrorState, LoadingState } from '../components/LoadingState';
import { TransactionList } from '../features/transactions/TransactionList';
import { TransactionDrawer } from '../features/transactions/TransactionDrawer';
import { ConfirmDialog } from '../components/ConfirmDialog';

type DeleteIntent = { kind: 'single'; record: Transaction } | { kind: 'batch'; count: number };

const DEFAULT_QUERY = {
  page: 1,
  pageSize: 20,
  sort: 'sourceOrder',
  order: 'desc',
} as const;

export default function TransactionsPage() {
  const client = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  const now = new Date();
  const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const [query, setQuery] = useState<TransactionQuery>(() => ({
    ...DEFAULT_QUERY,
    focusId: searchParams.get('focus') || undefined,
  }));
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState(new Set<string>());
  const [editing, setEditing] = useState<Transaction | null>(null);
  const [drawer, setDrawer] = useState(false);
  const [moreFilters, setMoreFilters] = useState(false);
  const [notice, setNotice] = useState('');
  const [deleteIntent, setDeleteIntent] = useState<DeleteIntent | null>(null);
  const [exporting, setExporting] = useState(false);
  const [focusedId, setFocusedId] = useState<string | null>(null);
  const result = useQuery({
    queryKey: ['transactions', query],
    queryFn: () => apiClient.transactions(query),
    placeholderData: (previousData) => previousData,
  });
  const monthSummary = useQuery({
    queryKey: ['summary', month],
    queryFn: () => apiClient.summary(`${month}-01`, `${month}-${monthEnd}`),
  });
  const invalidate = async () => {
    await Promise.all([
      client.invalidateQueries({ queryKey: ['transactions'] }),
      client.invalidateQueries({ queryKey: ['summary'] }),
    ]);
  };
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
  const exportAll = useMutation({
    mutationFn: apiClient.exportTransactions,
  });
  const records = useMemo(() => result.data?.items ?? [], [result.data?.items]);
  useEffect(() => {
    const focusId = query.focusId;
    if (!focusId || !result.data || focusedId) return;
    const nextParams = new URLSearchParams(searchParams);
    nextParams.delete('focus');
    setSearchParams(nextParams, { replace: true });
    if (!records.some((record) => record.id === focusId)) {
      setQuery((current) => ({
        ...current,
        page: result.data.page,
        focusId: undefined,
      }));
      return;
    }
    setFocusedId(focusId);
  }, [focusedId, query.focusId, records, result.data, searchParams, setSearchParams]);
  useEffect(() => {
    if (!focusedId) return;
    const frame = requestAnimationFrame(() => {
      const scope = window.matchMedia?.('(max-width: 680px)').matches
        ? '.mobile-list'
        : '.desktop-list';
      const target = [
        ...document.querySelectorAll<HTMLElement>(`${scope} [data-transaction-id]`),
      ].find((element) => element.dataset.transactionId === focusedId);
      target?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    });
    const timer = window.setTimeout(() => {
      setFocusedId(null);
      setQuery((current) => ({
        ...current,
        page: result.data?.page ?? current.page,
        focusId: undefined,
      }));
    }, 1500);
    return () => {
      cancelAnimationFrame(frame);
      window.clearTimeout(timer);
    };
  }, [focusedId, result.data?.page]);
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
  const runExport = async (format: 'csv' | 'excel') => {
    if (exporting) return;
    setExporting(true);
    try {
      const exported = await exportAll.mutateAsync();
      if (format === 'csv') downloadCsv(exported.items, '交易明细.csv');
      else await downloadExcel(exported.items, '交易明细.xlsx');
      setNotice(
        exported.warnings.length
          ? `已导出全部 ${exported.total} 条记录；${exported.warnings.length} 个字段无法识别，已留空`
          : `已导出全部 ${exported.total} 条记录`,
      );
    } catch (error) {
      setNotice(error instanceof Error ? error.message : '导出失败');
    } finally {
      setExporting(false);
    }
  };
  const confirmDelete = async () => {
    if (!deleteIntent) return;
    try {
      if (deleteIntent.kind === 'single') await remove.mutateAsync(deleteIntent.record.id);
      else await batchDelete.mutateAsync();
      setDeleteIntent(null);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : '删除失败');
    }
  };
  return (
    <section className="page">
      <header className="page-header">
        <div>
          <div className="page-title-row">
            <h1>交易明细</h1>
            <span className="monthly-profit">
              本月利润{' '}
              {monthSummary.data?.profit === null || monthSummary.data?.profit === undefined
                ? '—'
                : `¥${monthSummary.data.profit.toLocaleString('zh-CN', {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}`}
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
            placeholder="搜索商品名称"
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
          更多筛选
        </button>
        <div className="toolbar-spacer" />
        <button
          className="icon-button"
          title="导出 CSV"
          onClick={() => runExport('csv')}
          disabled={exporting}
        >
          <Download size={17} />
          <span className="sr-only">导出 CSV</span>
        </button>
        <button
          className="icon-button"
          title="导出 Excel"
          onClick={() => runExport('excel')}
          disabled={exporting}
        >
          <SlidersHorizontal size={17} />
          <span className="sr-only">导出 Excel</span>
        </button>
      </div>
      {moreFilters && (
        <div className="filter-panel">
          <label className="filter-panel__mobile-only">
            状态
            <select
              aria-label="移动端状态筛选"
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
          </label>
          <label className="filter-panel__mobile-only">
            开始日期
            <input
              aria-label="移动端开始日期"
              type="date"
              value={query.from ?? ''}
              onChange={(event) =>
                setQuery((current) => ({
                  ...current,
                  page: 1,
                  from: event.target.value || undefined,
                }))
              }
            />
          </label>
          <label>
            结束日期
            <input
              aria-label="结束日期"
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
              setQuery({ ...DEFAULT_QUERY });
            }}
          >
            重置筛选
          </button>
          <div className="mobile-export-actions">
            <button
              className="button button--secondary"
              onClick={() => runExport('csv')}
              disabled={exporting}
            >
              导出全部 CSV
            </button>
            <button
              className="button button--secondary"
              onClick={() => runExport('excel')}
              disabled={exporting}
            >
              导出全部 Excel
            </button>
          </div>
        </div>
      )}
      {result.data && result.data.warnings.length > 0 && (
        <div className="data-note" role="status">
          有 {result.data.warnings.length} 个飞书字段无法识别，相关位置已显示为 —。
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
          focusedId={focusedId}
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
            disabled={result.data.page === 1}
            onClick={() => setQuery((current) => ({ ...current, page: result.data.page - 1 }))}
          >
            上一页
          </button>
          <span>
            第 {result.data.page} / {Math.ceil(result.data.total / result.data.pageSize)} 页
          </span>
          <button
            className="button button--secondary"
            disabled={result.data.page >= Math.ceil(result.data.total / result.data.pageSize)}
            onClick={() => setQuery((current) => ({ ...current, page: result.data.page + 1 }))}
          >
            下一页
          </button>
        </div>
      )}
      {selected.size > 0 && (
        <div className="bulk-bar" role="region" aria-label="批量操作">
          <strong>已选择 {selected.size} 项</strong>
          <div>
            {TRANSACTION_STATUSES.map((status) => (
              <button
                key={status}
                aria-label={`标记${status}`}
                onClick={() => batchStatus.mutate(status)}
                disabled={batchStatus.isPending}
              >
                标记{status}
              </button>
            ))}
            <button
              className="danger-text"
              aria-label="删除所选交易"
              onClick={() => setDeleteIntent({ kind: 'batch', count: selected.size })}
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
                setDeleteIntent({ kind: 'single', record: editing });
              }
            : undefined
        }
      />
      <ConfirmDialog
        open={deleteIntent !== null}
        title={deleteIntent?.kind === 'batch' ? '删除所选交易？' : '删除这条交易？'}
        description={
          deleteIntent?.kind === 'batch'
            ? `将删除 ${deleteIntent.count} 条交易，删除后无法恢复。`
            : `“${deleteIntent?.record.title ?? '未命名交易'}”删除后无法恢复。`
        }
        confirmLabel="删除"
        pending={remove.isPending || batchDelete.isPending}
        onCancel={() => setDeleteIntent(null)}
        onConfirm={confirmDelete}
      />
      {notice && (
        <button className="toast" onClick={() => setNotice('')} role="status">
          {notice}
        </button>
      )}
    </section>
  );
}
