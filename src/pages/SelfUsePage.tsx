import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, Search } from 'lucide-react';
import { apiClient } from '../api/client';
import { ErrorState, LoadingState } from '../components/LoadingState';
import { TransactionDrawer } from '../features/transactions/TransactionDrawer';
import { SaleConfirmDialog } from '../features/self-use/SaleConfirmDialog';
import { SelfUseList } from '../features/self-use/SelfUseList';
import {
  createSaleInput,
  getSelfUseRecords,
  type SaleValues,
  type SelfUseSort,
  type SelfUseStatus,
} from '../domain/self-use';
import type { Transaction, TransactionInput } from '../domain/transaction';

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

export default function SelfUsePage({ status = '自用中' }: { status?: SelfUseStatus }) {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [sortIndex, setSortIndex] = useState(0);
  const [selling, setSelling] = useState<Transaction | null>(null);
  const [editing, setEditing] = useState<Transaction | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(() => new Set());
  const [notice, setNotice] = useState('');
  const sortOption = sortOptions[sortIndex];
  useEffect(() => {
    setNotice('');
    setDismissedIds(new Set());
    setSelling(null);
    setEditing(null);
    setDrawerOpen(false);
  }, [status]);

  const isPendingReceipt = status === '待收货';
  const itemLabel = isPendingReceipt ? '待收货物品' : status === '自用中' ? '自用物品' : '在售物品';
  const managementLabel = isPendingReceipt
    ? '管理待收货产品'
    : status === '自用中'
      ? '管理自用产品'
      : '管理在售产品';
  const pageTitle = isPendingReceipt
    ? '待收货产品'
    : status === '自用中'
      ? '正在自用中的产品'
      : '正在售卖中的产品';
  const loadingLabel = isPendingReceipt
    ? '正在加载待收货产品'
    : status === '自用中'
      ? '正在加载自用中的产品'
      : '正在加载售卖中的产品';
  const alternateStatus = isPendingReceipt ? '在售中' : status === '自用中' ? '在售中' : '自用中';

  const result = useQuery({
    queryKey: ['self-use-records', status, search],
    queryFn: () => fetchStatusRecords(status, search),
  });

  const records = useMemo(
    () =>
      getSelfUseRecords(result.data ?? [], sortOption.sort, sortOption.order, status).filter(
        (record) => !dismissedIds.has(record.id),
      ),
    [dismissedIds, result.data, sortOption.order, sortOption.sort, status],
  );

  const refresh = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['self-use-records'] }),
      queryClient.invalidateQueries({ queryKey: ['transactions'] }),
      queryClient.invalidateQueries({ queryKey: ['summary'] }),
    ]);
  };

  const changeStatus = useMutation({
    mutationFn: async ({ record, nextStatus }: { record: Transaction; nextStatus: SelfUseStatus }) => {
      const response = await apiClient.batchStatus([record.id], nextStatus);
      const failed = response.results.find((item) => !item.success);
      if (failed) throw new Error(failed.message ?? '状态更新失败');
      return response;
    },
    onSuccess: async (_, { record, nextStatus }) => {
      setDismissedIds((current) => new Set(current).add(record.id));
      await refresh();
      setNotice(`已标记为${nextStatus}`);
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
          <h1>{pageTitle}</h1>
          <p>{result.data ? `${records.length} 件物品 · ${managementLabel}` : managementLabel}</p>
        </div>
        <button className="button button--primary" onClick={() => openDrawer(null)}>
          <Plus size={16} />
          添加
        </button>
      </header>
      <div className="self-use-window">
        <div className="self-use-toolbar">
          <div className="search-box self-use-search">
            <Search size={16} />
            <input
              aria-label={`搜索${itemLabel}`}
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
          <LoadingState label={loadingLabel} />
        ) : result.isError ? (
          <ErrorState message={result.error.message} onRetry={() => result.refetch()} />
        ) : records.length === 0 ? (
          <div className="empty-state">
            <strong>没有{status}物品</strong>
            <span>添加一笔交易，或调整搜索条件。</span>
            <button className="button button--primary" onClick={() => openDrawer(null)}>
              添加
            </button>
          </div>
        ) : (
          <SelfUseList
            records={records}
            listingId={changeStatus.isPending ? changeStatus.variables.record.id : null}
            alternateStatus={alternateStatus}
            onChangeStatus={(record, nextStatus) => changeStatus.mutate({ record, nextStatus })}
            onSell={setSelling}
            onOpen={openDrawer}
            showActions
            showSaleAction={!isPendingReceipt}
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
