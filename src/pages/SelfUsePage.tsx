import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, Search } from 'lucide-react';
import { apiClient } from '../api/client';
import { ErrorState, LoadingState } from '../components/LoadingState';
import { TransactionDrawer } from '../features/transactions/TransactionDrawer';
import { SaleConfirmDialog } from '../features/self-use/SaleConfirmDialog';
import { SelfUseList } from '../features/self-use/SelfUseList';
import {
  SELF_USE_STATUSES,
  createSaleInput,
  getSelfUseRecords,
  type SaleValues,
  type SelfUseSort,
  type SelfUseStatus,
} from '../domain/self-use';
import type { Transaction, TransactionInput } from '../domain/transaction';

type StatusFilter = '全部' | SelfUseStatus;

const sortOptions: Array<{ label: string; sort: SelfUseSort; order: 'asc' | 'desc' }> = [
  { label: '最新购入', sort: 'purchaseDate', order: 'desc' },
  { label: '持有最久', sort: 'holdingDays', order: 'desc' },
  { label: '成本最高', sort: 'totalCost', order: 'desc' },
];

async function fetchStatusRecords(status: SelfUseStatus, search: string) {
  const items: Transaction[] = [];
  let page = 1;
  while (true) {
    const response = await apiClient.transactions({
      page,
      pageSize: 100,
      status,
      q: search || undefined,
      sort: 'sourceOrder',
      order: 'asc',
    });
    items.push(...response.items);
    if (page * response.pageSize >= response.total) return items;
    page += 1;
  }
}

export default function SelfUsePage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('全部');
  const [sortIndex, setSortIndex] = useState(0);
  const [selling, setSelling] = useState<Transaction | null>(null);
  const [editing, setEditing] = useState<Transaction | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(() => new Set());
  const [notice, setNotice] = useState('');
  const sortOption = sortOptions[sortIndex];

  const result = useQuery({
    queryKey: ['self-use-records', search],
    queryFn: async () => {
      const pages = await Promise.all(
        SELF_USE_STATUSES.map((status) => fetchStatusRecords(status, search)),
      );
      return pages.flat();
    },
  });

  const activeRecords = useMemo(
    () =>
      getSelfUseRecords(result.data ?? [], 'purchaseDate', 'desc').filter(
        (record) => !dismissedIds.has(record.id),
      ),
    [dismissedIds, result.data],
  );

  const records = useMemo(
    () =>
      getSelfUseRecords(
        activeRecords,
        sortOption.sort,
        sortOption.order,
        statusFilter === '全部' ? undefined : statusFilter,
      ),
    [activeRecords, sortOption.order, sortOption.sort, statusFilter],
  );

  const refresh = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['self-use-records'] }),
      queryClient.invalidateQueries({ queryKey: ['transactions'] }),
      queryClient.invalidateQueries({ queryKey: ['summary'] }),
    ]);
  };

  const markListed = useMutation({
    mutationFn: async (record: Transaction) => {
      const response = await apiClient.batchStatus([record.id], '在售中');
      const failed = response.results.find((item) => !item.success);
      if (failed) throw new Error(failed.message ?? '状态更新失败');
      return response;
    },
    onSuccess: async () => {
      await refresh();
      setNotice('已标记为在售中');
    },
    onError: (error) => {
      setNotice(error instanceof Error ? error.message : '状态更新失败');
    },
  });
  const sell = useMutation({
    mutationFn: ({ record, values }: { record: Transaction; values: SaleValues }) =>
      apiClient.updateTransaction(record.id, createSaleInput(record, values)),
    onSuccess: async (updated) => {
      setDismissedIds((current) => new Set(current).add(updated.id));
      setSelling(null);
      await refresh();
      setNotice('已售出');
    },
  });
  const save = useMutation({
    mutationFn: ({ record, input }: { record: Transaction | null; input: TransactionInput }) =>
      record ? apiClient.updateTransaction(record.id, input) : apiClient.createTransaction(input),
    onSuccess: async () => {
      setDrawerOpen(false);
      await refresh();
      setNotice('交易已保存');
    },
  });

  const counts = useMemo(
    () => ({
      全部: activeRecords.length,
      自用中: activeRecords.filter((record) => record.status === '自用中').length,
      在售中: activeRecords.filter((record) => record.status === '在售中').length,
    }),
    [activeRecords],
  );

  const openDrawer = (record: Transaction | null) => {
    setEditing(record);
    setDrawerOpen(true);
  };
  const confirmSale = async (values: SaleValues) => {
    if (!selling) return;
    await sell.mutateAsync({ record: selling, values });
  };

  return (
    <section className="page page--self-use">
      <header className="page-header self-use-page-header">
        <div>
          <h1>自用/在售中</h1>
          <p>{result.data ? `${counts.全部} 件物品 · 管理使用与出售状态` : '管理使用与出售状态'}</p>
        </div>
        <button className="button button--primary" onClick={() => openDrawer(null)}>
          <Plus size={16} />
          添加
        </button>
      </header>
      <div className="self-use-window">
        <div className="self-use-toolbar">
          <div className="self-use-segmented" role="group" aria-label="自用状态筛选">
            {(['全部', ...SELF_USE_STATUSES] as StatusFilter[]).map((status) => (
              <button
                key={status}
                type="button"
                aria-pressed={statusFilter === status}
                onClick={() => setStatusFilter(status)}
              >
                {status} {counts[status]}
              </button>
            ))}
          </div>
          <div className="toolbar-spacer" />
          <div className="search-box self-use-search">
            <Search size={16} />
            <input
              aria-label="搜索自用物品"
              placeholder="搜索物品"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </div>
          <select
            aria-label="排序"
            value={sortIndex}
            onChange={(event) => setSortIndex(Number(event.target.value))}
          >
            {sortOptions.map((option, index) => (
              <option key={option.label} value={index}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
        {notice && (
          <div className="data-note" role="status">
            {notice}
          </div>
        )}
        {result.isLoading ? (
          <LoadingState label="正在加载自用物品" />
        ) : result.isError ? (
          <ErrorState message={result.error.message} onRetry={() => result.refetch()} />
        ) : records.length === 0 ? (
          <div className="empty-state">
            <strong>没有自用或在售物品</strong>
            <span>添加一笔交易，或调整筛选条件。</span>
            <button className="button button--primary" onClick={() => openDrawer(null)}>
              添加
            </button>
          </div>
        ) : (
          <SelfUseList
            records={records}
            listingId={markListed.isPending ? markListed.variables.id : null}
            onMarkListed={(record) => markListed.mutate(record)}
            onSell={setSelling}
            onOpen={openDrawer}
          />
        )}
      </div>
      <SaleConfirmDialog
        record={selling}
        open={Boolean(selling)}
        saving={sell.isPending}
        onClose={() => !sell.isPending && setSelling(null)}
        onConfirm={confirmSale}
      />
      <TransactionDrawer
        record={editing}
        open={drawerOpen}
        saving={save.isPending}
        onClose={() => !save.isPending && setDrawerOpen(false)}
        onSave={async (input) => {
          await save.mutateAsync({ record: editing, input });
        }}
      />
    </section>
  );
}
