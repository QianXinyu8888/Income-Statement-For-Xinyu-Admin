import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { apiClient, type TransactionPage } from '../api/client';
import type { Transaction } from '../domain/transaction';
import type { TransactionWorkspace } from '../domain/transaction-workspace';
import SelfUsePage from './SelfUsePage';

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

const personal: Transaction = {
  id: 'personal',
  title: '耳机',
  salePrice: null,
  costPrice: 900,
  purchaseShippingFee: 20,
  saleShippingFee: null,
  totalCost: 920,
  profit: null,
  roi: null,
  status: '自用中',
  purchaseDate: '2026-05-01',
  soldDate: null,
  holdingDays: 50,
  note: null,
};

const listed: Transaction = {
  ...personal,
  id: 'listed',
  title: '键盘',
  status: '在售中',
  holdingDays: 120,
};
const sold: Transaction = { ...personal, id: 'sold', title: '显示器', status: '已售出' };

const personalPage: TransactionPage = {
  items: [personal, sold],
  total: 2,
  page: 1,
  pageSize: 100,
  warnings: [],
};
const listedPage: TransactionPage = {
  items: [listed],
  total: 1,
  page: 1,
  pageSize: 100,
  warnings: [],
};
const pending: Transaction = {
  ...personal,
  id: 'pending',
  title: '相机',
  status: '待收货',
};
const pendingPage: TransactionPage = {
  items: [pending, listed],
  total: 2,
  page: 1,
  pageSize: 100,
  warnings: [],
};

function renderPage(status: '待收货' | '自用中' | '在售中' = '自用中') {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <SelfUsePage status={status} />
    </QueryClientProvider>,
  );
}

function mockActiveRecords() {
  vi.spyOn(apiClient, 'transactionWorkspace').mockImplementation((query) => {
    const transactions =
      query.status === '待收货'
        ? pendingPage
        : query.status === '在售中'
          ? listedPage
          : personalPage;
    return Promise.resolve({
      transactions,
      summary: {} as TransactionWorkspace['summary'],
      warnings: [],
    });
  });
}

describe('SelfUsePage', () => {
  it('uses product-focused titles for self-use and listed workspaces', async () => {
    mockActiveRecords();
    renderPage();

    expect(await screen.findByRole('heading', { name: '正在自用中的产品' })).toBeInTheDocument();

    cleanup();
    renderPage('在售中');

    expect(await screen.findByRole('heading', { name: '正在售卖中的产品' })).toBeInTheDocument();
  });

  it('renders pending receipt as a product status workspace', async () => {
    mockActiveRecords();
    renderPage('待收货');

    expect(await screen.findByRole('heading', { name: '待收货产品' })).toBeInTheDocument();
    expect(await screen.findAllByText('相机')).toHaveLength(2);
    expect(screen.queryByText('键盘')).not.toBeInTheDocument();
    expect(screen.getByText('1 件物品 · 管理待收货产品')).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: '设置 相机 为在售中' }).length).toBeGreaterThan(0);
    expect(screen.queryByRole('button', { name: '设置 相机 为已售出' })).not.toBeInTheDocument();
    expect(apiClient.transactionWorkspace).toHaveBeenCalledWith(
      expect.objectContaining({ status: '待收货', pageSize: 100, all: true }),
    );
  });

  it('uses product-focused loading copy for self-use and listed workspaces', () => {
    vi.spyOn(apiClient, 'transactions').mockImplementation(
      () => new Promise<TransactionPage>(() => {}),
    );
    renderPage();

    expect(screen.getByText('正在加载自用中的产品')).toBeInTheDocument();

    cleanup();
    renderPage('在售中');

    expect(screen.getByText('正在加载售卖中的产品')).toBeInTheDocument();
  });

  it('loads only self-use records and excludes other statuses', async () => {
    mockActiveRecords();
    renderPage();

    expect(await screen.findAllByText('耳机')).toHaveLength(2);
    expect(screen.queryByText('键盘')).not.toBeInTheDocument();
    expect(screen.queryByText('显示器')).not.toBeInTheDocument();
    expect(screen.getByText('1 件物品 · 管理自用产品')).toBeInTheDocument();
    expect(apiClient.transactionWorkspace).toHaveBeenCalledWith(
      expect.objectContaining({ status: '自用中', pageSize: 100, all: true }),
    );
    expect(apiClient.transactionWorkspace).not.toHaveBeenCalledWith(
      expect.objectContaining({ status: '在售中' }),
    );
  });

  it('does not render a separate listed section', async () => {
    mockActiveRecords();
    renderPage();

    expect(await screen.findAllByText('耳机')).toHaveLength(2);
    expect(screen.queryByRole('region', { name: '在售中' })).not.toBeInTheDocument();
  });

  it('loads every active-status record through one all-record workspace query before sorting', async () => {
    vi.spyOn(apiClient, 'transactionWorkspace').mockResolvedValue({
      transactions: { ...personalPage, total: 101, pageSize: 101 },
      summary: {} as TransactionWorkspace['summary'],
      warnings: [],
    });
    renderPage();

    await screen.findAllByText('耳机');
    await waitFor(() =>
      expect(apiClient.transactionWorkspace).toHaveBeenCalledWith(
        expect.objectContaining({ status: '自用中', page: 1, pageSize: 100, all: true }),
      ),
    );
  });

  it('waits for typing to settle before issuing one status search request', async () => {
    vi.useFakeTimers();
    mockActiveRecords();
    renderPage();
    await act(async () => {});
    const workspaceMock = vi.mocked(apiClient.transactionWorkspace);
    expect(workspaceMock).toHaveBeenCalledTimes(1);

    fireEvent.change(screen.getByRole('textbox', { name: '搜索自用物品' }), {
      target: { value: '耳' },
    });
    fireEvent.change(screen.getByRole('textbox', { name: '搜索自用物品' }), {
      target: { value: '耳机' },
    });
    await act(async () => vi.advanceTimersByTime(249));
    expect(workspaceMock).toHaveBeenCalledTimes(1);

    await act(async () => vi.advanceTimersByTime(1));
    expect(workspaceMock).toHaveBeenLastCalledWith(
      expect.objectContaining({ status: '自用中', q: '耳机', all: true }),
    );
    vi.useRealTimers();
  });

  it('marks an item as listed through the existing status API', async () => {
    const user = userEvent.setup();
    mockActiveRecords();
    const markListed = vi.spyOn(apiClient, 'batchStatus').mockResolvedValue({
      results: [{ id: personal.id, success: true }],
    });
    renderPage();

    await user.click((await screen.findAllByRole('button', { name: '设置 耳机 为在售中' }))[0]);

    await waitFor(() => expect(markListed).toHaveBeenCalledWith([personal.id], '在售中'));
  });

  it('marks a pending receipt item as listed and removes it from the page', async () => {
    const user = userEvent.setup();
    mockActiveRecords();
    const markListed = vi.spyOn(apiClient, 'batchStatus').mockResolvedValue({
      results: [{ id: pending.id, success: true }],
    });
    renderPage('待收货');

    await user.click((await screen.findAllByRole('button', { name: '设置 相机 为在售中' }))[0]);

    await waitFor(() => {
      expect(markListed).toHaveBeenCalledWith([pending.id], '在售中');
      expect(screen.queryByText('相机')).not.toBeInTheDocument();
    });
  });

  it('marks a listed item as self-use through the existing status API', async () => {
    const user = userEvent.setup();
    mockActiveRecords();
    const markSelfUse = vi.spyOn(apiClient, 'batchStatus').mockResolvedValue({
      results: [{ id: listed.id, success: true }],
    });
    renderPage('在售中');

    await user.click((await screen.findAllByRole('button', { name: '设置 键盘 为自用中' }))[0]);

    await waitFor(() => expect(markSelfUse).toHaveBeenCalledWith([listed.id], '自用中'));
  });

  it('removes a listed item after changing it to self-use', async () => {
    const user = userEvent.setup();
    mockActiveRecords();
    vi.spyOn(apiClient, 'batchStatus').mockResolvedValue({
      results: [{ id: listed.id, success: true }],
    });
    renderPage('在售中');

    await user.click((await screen.findAllByRole('button', { name: '设置 键盘 为自用中' }))[0]);

    await waitFor(() => expect(screen.queryByText('键盘')).not.toBeInTheDocument());
  });

  it('clears status notices when switching to another product status page', async () => {
    const user = userEvent.setup();
    mockActiveRecords();
    vi.spyOn(apiClient, 'batchStatus').mockResolvedValue({
      results: [{ id: personal.id, success: true }],
    });
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const { rerender } = render(
      <QueryClientProvider client={client}>
        <SelfUsePage status="自用中" />
      </QueryClientProvider>,
    );

    await user.click((await screen.findAllByRole('button', { name: '设置 耳机 为在售中' }))[0]);
    expect(await screen.findByText('已标记为在售中')).toBeInTheDocument();

    rerender(
      <QueryClientProvider client={client}>
        <SelfUsePage status="待收货" />
      </QueryClientProvider>,
    );

    await screen.findByRole('heading', { name: '待收货产品' });
    expect(screen.queryByText('已标记为在售中')).not.toBeInTheDocument();
  });

  it('shows an error instead of a success notice when listing returns a failed item', async () => {
    const user = userEvent.setup();
    mockActiveRecords();
    vi.spyOn(apiClient, 'batchStatus').mockResolvedValue({
      results: [{ id: personal.id, success: false, message: '飞书暂不可用' }],
    });
    renderPage();

    await user.click((await screen.findAllByRole('button', { name: '设置 耳机 为在售中' }))[0]);

    expect(await screen.findByRole('status')).toHaveTextContent('飞书暂不可用');
  });

  it('shows a network error when marking an item as listed rejects', async () => {
    const user = userEvent.setup();
    mockActiveRecords();
    vi.spyOn(apiClient, 'batchStatus').mockRejectedValue(new Error('网络异常'));
    renderPage();

    await user.click((await screen.findAllByRole('button', { name: '设置 耳机 为在售中' }))[0]);

    expect(await screen.findByRole('status')).toHaveTextContent('网络异常');
  });

  it('removes a record after sale confirmation succeeds', async () => {
    const user = userEvent.setup();
    mockActiveRecords();
    vi.spyOn(apiClient, 'updateTransaction').mockResolvedValue({ ...personal, status: '已售出' });
    renderPage();

    await user.click((await screen.findAllByRole('button', { name: '设置 耳机 为已售出' }))[0]);
    const soldDate = screen.getByLabelText('售出日期');
    await user.clear(soldDate);
    await user.type(soldDate, '2026-06-20');
    await user.type(screen.getByRole('spinbutton', { name: '售价' }), '1200');
    await user.click(screen.getByRole('button', { name: '确认售出' }));

    await waitFor(() => expect(screen.queryByText('耳机')).not.toBeInTheDocument());
    expect(apiClient.updateTransaction).toHaveBeenCalledWith(
      personal.id,
      expect.objectContaining({ status: '已售出', salePrice: 1200, soldDate: '2026-06-20' }),
    );
  });

  it('sells a listed record with the confirmed sale details', async () => {
    const user = userEvent.setup();
    mockActiveRecords();
    vi.spyOn(apiClient, 'updateTransaction').mockResolvedValue({ ...listed, status: '已售出' });
    renderPage('在售中');

    await user.click((await screen.findAllByRole('button', { name: '设置 键盘 为已售出' }))[0]);
    const soldDate = screen.getByLabelText('售出日期');
    await user.clear(soldDate);
    await user.type(soldDate, '2026-06-21');
    await user.type(screen.getByRole('spinbutton', { name: '售价' }), '1500');
    await user.type(screen.getByRole('textbox', { name: '备注' }), '顺丰到付');
    await user.click(screen.getByRole('button', { name: '确认售出' }));

    await waitFor(() =>
      expect(apiClient.updateTransaction).toHaveBeenCalledWith(listed.id, {
        title: listed.title,
        salePrice: 1500,
        costPrice: listed.costPrice,
        purchaseShippingFee: listed.purchaseShippingFee,
        saleShippingFee: listed.saleShippingFee,
        status: '已售出',
        purchaseDate: listed.purchaseDate,
        soldDate: '2026-06-21',
        note: '顺丰到付',
      }),
    );
  });
});
