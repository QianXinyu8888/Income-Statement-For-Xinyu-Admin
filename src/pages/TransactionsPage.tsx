import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Download, Plus, RotateCcw, Search, SlidersHorizontal, X } from 'lucide-react';

import { useSearchParams } from 'react-router-dom';
import { apiClient, type TransactionQuery } from '../api/client';
import type {
  EditableTransactionField,
  Transaction,
  TransactionInput,
  TransactionStatus,
} from '../domain/transaction';
import type { TransactionDateField } from '../domain/transaction-query';
import { TRANSACTION_STATUSES } from '../domain/transaction';
import { downloadExcel } from '../domain/export';
import { ErrorState, LoadingState } from '../components/LoadingState';
import { TransactionList } from '../features/transactions/TransactionList';
import { TransactionDrawer } from '../features/transactions/TransactionDrawer';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { Pagination } from '../components/Pagination';
import { ColumnVisibilityPanel } from '../features/transactions/ColumnVisibilityPanel';
import { useBrowserPreferences } from '../preferences/BrowserPreferencesContext';

type DeleteIntent = { kind: 'single'; record: Transaction } | { kind: 'batch'; count: number };

const DEFAULT_QUERY = {
  page: 1,
  pageSize: 20,
  sort: 'purchaseDate',
  order: 'desc',
  dateField: 'purchaseDate',
} as const;

export default function TransactionsPage({
  initialStatus,
}: { initialStatus?: TransactionStatus } = {}) {
  const client = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  const {
    preferences: { visibleTransactionFields },
    setTransactionFieldVisible,
    resetTransactionFields,
  } = useBrowserPreferences();
  const now = new Date();
  const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const [query, setQuery] = useState<TransactionQuery>(() => ({
    ...DEFAULT_QUERY,
    status: initialStatus,
    focusId: searchParams.get('focus') || undefined,
  }));
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState(new Set<string>());
  const [editing, setEditing] = useState<Transaction | null>(null);
  const [initialFocus, setInitialFocus] = useState<EditableTransactionField>('title');
  const [drawer, setDrawer] = useState(false);
  const [notice, setNotice] = useState('');
  const [deleteIntent, setDeleteIntent] = useState<DeleteIntent | null>(null);
  const [exporting, setExporting] = useState(false);
  const [focusedId, setFocusedId] = useState<string | null>(null);
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);

  const hasActiveFilters = Boolean(search || query.status || query.from || query.to || query.q);
  const activeFilterCount = [query.status, query.from, query.to].filter(Boolean).length;
  const dateLabel = query.dateField === 'soldDate' ? '售出日期' : '购入日期';

  const handleResetFilters = () => {
    setSearch('');
    setQuery({ ...DEFAULT_QUERY, status: initialStatus });
  };

  const summaryRange = { summaryFrom: `${month}-01`, summaryTo: `${month}-${monthEnd}` };
  const workspaceKey = ['transaction-workspace', query, month] as const;
  const result = useQuery({
    queryKey: workspaceKey,
    queryFn: () => apiClient.transactionWorkspace(query, summaryRange),
    placeholderData: (previousData) => previousData,
  });
  const transactionData = result.data?.transactions;
  const refreshWorkspace = async () => {
    const fresh = await apiClient.transactionWorkspace(query, summaryRange);
    client.setQueryData(workspaceKey, fresh);
    return fresh;
  };
  const save = useMutation({
    mutationFn: ({ record, input }: { record: Transaction | null; input: TransactionInput }) =>
      record ? apiClient.updateTransaction(record.id, input) : apiClient.createTransaction(input),
    onSuccess: async () => {
      await refreshWorkspace();
      setDrawer(false);
      setNotice('交易已保存');
    },
  });
  const remove = useMutation({
    mutationFn: (id: string) => apiClient.deleteTransaction(id),
    onSuccess: async () => {
      await refreshWorkspace();
      setDrawer(false);
      setNotice('交易已删除');
    },
  });
  const batchStatus = useMutation({
    mutationFn: (status: TransactionStatus) => apiClient.batchStatus([...selected], status),
    onSuccess: async ({ results }) => {
      const failed = results.filter((item) => !item.success).length;
      await refreshWorkspace();
      if (!failed) setSelected(new Set());
      setNotice(failed ? `${failed} 条记录更新失败，已保留选择` : '状态已更新');
    },
  });
  const batchDelete = useMutation({
    mutationFn: () => apiClient.batchDelete([...selected]),
    onSuccess: async ({ results }) => {
      const failed = results.filter((item) => !item.success).length;
      await refreshWorkspace();
      if (!failed) setSelected(new Set());
      setNotice(failed ? `${failed} 条记录删除失败，已保留选择` : '记录已删除');
    },
  });
  const exportAll = useMutation({
    mutationFn: apiClient.exportTransactions,
  });
  const records = useMemo(() => transactionData?.items ?? [], [transactionData?.items]);
  useEffect(() => {
    const focusId = query.focusId;
    if (!focusId || !transactionData || focusedId) return;
    const nextParams = new URLSearchParams(searchParams);
    nextParams.delete('focus');
    setSearchParams(nextParams, { replace: true });
    if (!records.some((record) => record.id === focusId)) {
      setQuery((current) => ({
        ...current,
        page: transactionData.page,
        focusId: undefined,
      }));
      return;
    }
    setFocusedId(focusId);
  }, [focusedId, query.focusId, records, searchParams, setSearchParams, transactionData]);
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
        page: transactionData?.page ?? current.page,
        focusId: undefined,
      }));
    }, 1500);
    return () => {
      cancelAnimationFrame(frame);
      window.clearTimeout(timer);
    };
  }, [focusedId, transactionData?.page]);
  useEffect(() => {
    if (!mobileFiltersOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        setMobileFiltersOpen(false);
      }
    };
    window.addEventListener('keydown', closeOnEscape);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', closeOnEscape);
    };
  }, [mobileFiltersOpen]);
  const open = (record: Transaction | null, field: EditableTransactionField = 'title') => {
    setEditing(record);
    setInitialFocus(field);
    setDrawer(true);
  };
  const submitSearch = () => setQuery((current) => ({ ...current, page: 1, q: search }));
  const runExportExcel = async () => {
    if (exporting) return;
    setExporting(true);
    try {
      const exported = await exportAll.mutateAsync();
      await downloadExcel(exported.items, '交易明细.xlsx');
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
    <section className="page page--transactions">
      <header className="page-header">
        <div>
          <div className="page-title-row">
            <h1>交易明细</h1>
            <span className="monthly-profit">
              本月利润{' '}
              {result.data?.summary.profit === null || result.data?.summary.profit === undefined
                ? '—'
                : `¥${result.data.summary.profit.toLocaleString('zh-CN', {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}`}
            </span>
          </div>
          <p>
            {transactionData ? `共 ${transactionData.total} 条记录` : '查找、记录和管理每一笔交易'}
          </p>
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
            id="tx-search-input"
            name="search"
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
        <div className="desktop-filter-controls">
          <select
            id="tx-status-filter"
            name="statusFilter"
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
          <div className="date-filter-group" aria-label="日期范围筛选">
            <select
              id="tx-date-field-filter"
              name="dateFieldFilter"
              aria-label="日期类型"
              value={query.dateField ?? 'purchaseDate'}
              onChange={(event) =>
                setQuery((current) => ({
                  ...current,
                  page: 1,
                  dateField: event.target.value as TransactionDateField,
                }))
              }
            >
              <option value="purchaseDate">购入日期</option>
              <option value="soldDate">售出日期</option>
            </select>
            <div className={`date-input-shell${query.from ? ' has-value' : ''}`}>
              <input
                id="tx-from-date-filter"
                name="fromDateFilter"
                aria-label={`${dateLabel}开始`}
                title="可直接输入日期，也可点击日历选择"
                inputMode="numeric"
                className="date-filter-input"
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
              {!query.from && <span aria-hidden="true">年-月-日</span>}
            </div>
            <span className="date-filter-separator" aria-hidden="true">
              至
            </span>
            <div className={`date-input-shell${query.to ? ' has-value' : ''}`}>
              <input
                id="tx-to-date-filter"
                name="toDateFilter"
                aria-label={`${dateLabel}结束`}
                title="可直接输入日期，也可点击日历选择"
                inputMode="numeric"
                className="date-filter-input"
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
              {!query.to && <span aria-hidden="true">年-月-日</span>}
            </div>
          </div>
          <ColumnVisibilityPanel
            visibleFields={visibleTransactionFields}
            onFieldVisible={setTransactionFieldVisible}
            onReset={resetTransactionFields}
          />
          <button
            className="button button--secondary reset-button"
            onClick={handleResetFilters}
            disabled={!hasActiveFilters}
            aria-label="重置筛选"
            title="重置所有搜索和筛选条件"
          >
            <RotateCcw size={14} />
          </button>
        </div>
        <button
          type="button"
          className="icon-button mobile-filter-trigger"
          aria-label={`打开筛选条件${activeFilterCount ? `，已启用 ${activeFilterCount} 项` : ''}`}
          onClick={() => setMobileFiltersOpen(true)}
        >
          <SlidersHorizontal size={18} />
          {activeFilterCount > 0 && (
            <span className="mobile-filter-trigger__badge" aria-hidden="true">
              {activeFilterCount}
            </span>
          )}
        </button>
        <div className="toolbar-spacer" />
        <button
          className="icon-button"
          title="导出 Excel"
          onClick={runExportExcel}
          disabled={exporting}
        >
          <Download size={17} />
          <span className="sr-only">导出 Excel</span>
        </button>
      </div>
      {mobileFiltersOpen && (
        <>
          <button
            type="button"
            className="mobile-filter-backdrop"
            aria-label="关闭筛选条件"
            onClick={() => setMobileFiltersOpen(false)}
          />
          <section className="mobile-filter-sheet" role="region" aria-label="筛选交易">
            <header>
              <h2>筛选交易</h2>
              <button
                type="button"
                className="icon-button"
                aria-label="关闭筛选条件"
                onClick={() => setMobileFiltersOpen(false)}
              >
                <X size={18} />
              </button>
            </header>
            <label>
              状态
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
            </label>
            <label>
              日期类型
              <select
                aria-label="日期类型"
                value={query.dateField ?? 'purchaseDate'}
                onChange={(event) =>
                  setQuery((current) => ({
                    ...current,
                    page: 1,
                    dateField: event.target.value as TransactionDateField,
                  }))
                }
              >
                <option value="purchaseDate">购入日期</option>
                <option value="soldDate">售出日期</option>
              </select>
            </label>
            <label>
              {dateLabel}开始
              <div className={`date-input-shell${query.from ? ' has-value' : ''}`}>
                <input
                  aria-label={`${dateLabel}开始`}
                  title="可直接输入日期，也可点击日历选择"
                  inputMode="numeric"
                  className="date-filter-input"
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
                {!query.from && <span aria-hidden="true">年-月-日</span>}
              </div>
            </label>
            <label>
              {dateLabel}结束
              <div className={`date-input-shell${query.to ? ' has-value' : ''}`}>
                <input
                  aria-label={`${dateLabel}结束`}
                  title="可直接输入日期，也可点击日历选择"
                  inputMode="numeric"
                  className="date-filter-input"
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
                {!query.to && <span aria-hidden="true">年-月-日</span>}
              </div>
            </label>
            <footer>
              <button
                type="button"
                className="button button--secondary"
                onClick={handleResetFilters}
                disabled={!hasActiveFilters}
              >
                重置
              </button>
              <button
                type="button"
                className="button button--primary"
                onClick={() => setMobileFiltersOpen(false)}
              >
                完成
              </button>
            </footer>
          </section>
        </>
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
          visibleFields={visibleTransactionFields}
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
        />
      )}
      {transactionData && transactionData.total > 0 && (
        <Pagination
          page={transactionData.page}
          pageSize={transactionData.pageSize}
          total={transactionData.total}
          onPageChange={(targetPage) => setQuery((current) => ({ ...current, page: targetPage }))}
        />
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
        initialFocus={initialFocus}
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
