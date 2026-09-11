// @vitest-environment node
import { describe, expect, it, vi } from 'vitest';

const { listRecords } = vi.hoisted(() => ({ listRecords: vi.fn() }));

vi.mock('../../../_shared/env', () => ({ parseEnv: vi.fn(() => ({ appId: 'app' })) }));
vi.mock('../../../_shared/auth', () => ({ requireUser: vi.fn(async () => true) }));
vi.mock('../../../_shared/feishu', () => ({
  listRecords,
  createRecord: vi.fn(),
  updateRecord: vi.fn(),
  deleteRecord: vi.fn(),
}));

import { onRequest } from './[[path]]';

describe('transaction workspace endpoint', () => {
  it('reads Feishu records once and returns the current page with its monthly summary', async () => {
    listRecords.mockResolvedValue([
      {
        record_id: 'record-1',
        fields: {
          商品名称: '测试交易',
          交易状态: '已售出',
          '成交价(¥)': 1200,
          '购入成本(¥)': 500,
          '购入运费(¥)': 10,
          '总成本(¥)': 510,
          '利润(¥)': 690,
          购入日期: '2026-08-30',
          售出日期: '2026-09-02',
        },
      },
    ]);
    const request = new Request(
      'https://example.com/api/v1/transactions/workspace?page=1&pageSize=20&sort=purchaseDate&order=desc&summaryFrom=2026-09-01&summaryTo=2026-09-30',
    );
    const response = await onRequest({
      request,
      env: { ASSETS: { fetch } },
      params: { path: ['workspace'] },
      functionPath: '/api/v1/transactions/[[path]]',
      waitUntil: vi.fn(),
      passThroughOnException: vi.fn(),
      next: vi.fn(),
      data: {},
    } as Parameters<typeof onRequest>[0]);
    const body = (await response.json()) as { data: Record<string, unknown> };

    expect(listRecords).toHaveBeenCalledTimes(1);
    expect(body.data).toMatchObject({
      transactions: { total: 1, page: 1, pageSize: 20 },
      summary: { revenue: 1200, totalCost: 510, profit: 690, count: 1 },
      warnings: [],
    });
  });
});
