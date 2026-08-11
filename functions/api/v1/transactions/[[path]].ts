import { z } from 'zod';
import { parseEnv } from '../../../_shared/env';
import { requireUser } from '../../../_shared/auth';
import { createRecord, deleteRecord, listRecords, updateRecord } from '../../../_shared/feishu';
import { errorFromUnknown, errorResponse, jsonResponse } from '../../../_shared/http';
import {
  mapFeishuRecord,
  toFeishuFields,
  transactionSchema,
  TRANSACTION_STATUSES,
} from '../../../../src/domain/transaction';
import { queryTransactions } from '../../../../src/domain/transaction-query';

const querySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  q: z.string().trim().default(''),
  status: z.enum(TRANSACTION_STATUSES).optional(),
  from: z.string().date().optional(),
  to: z.string().date().optional(),
  sort: z
    .enum([
      'soldDate',
      'purchaseDate',
      'title',
      'salePrice',
      'costPrice',
      'totalCost',
      'profit',
      'status',
      'sortOrder',
    ])
    .default('soldDate'),
  order: z.enum(['asc', 'desc']).default('desc'),
  focusId: z.string().trim().min(1).optional(),
});

const batchStatusSchema = z.object({
  ids: z.array(z.string().min(1)).min(1).max(100),
  status: z.enum(TRANSACTION_STATUSES),
});
const batchDeleteSchema = z.object({ ids: z.array(z.string().min(1)).min(1).max(100) });

function routePath(value: unknown): string {
  return Array.isArray(value) ? value.join('/') : String(value ?? '');
}

async function resultList<T>(ids: string[], operation: (id: string) => Promise<T>) {
  const settled = await Promise.allSettled(ids.map(operation));
  return settled.map((result, index) =>
    result.status === 'fulfilled'
      ? { id: ids[index], success: true }
      : { id: ids[index], success: false, message: '操作失败' },
  );
}

export const onRequest: PagesFunction = async ({ request, env, params }) => {
  try {
    const config = parseEnv(env);
    if (!(await requireUser(request, config)))
      return errorResponse(request, 401, 'UNAUTHENTICATED', '请重新登录');
    const path = routePath(params.path);

    const readAll = async () => {
      const mapped = (await listRecords(config)).map(mapFeishuRecord);
      return {
        records: mapped.map(({ transaction }) => transaction),
        warnings: mapped.flatMap(({ transaction, warnings }) =>
          warnings.map((warning) => `${transaction.id}: ${warning}`),
        ),
      };
    };

    if (!path && request.method === 'GET') {
      const query = querySchema.parse(Object.fromEntries(new URL(request.url).searchParams));
      const { records, warnings } = await readAll();
      return jsonResponse(request, { ...queryTransactions(records, query), warnings });
    }
    if (path === 'export' && request.method === 'GET') {
      const { records, warnings } = await readAll();
      return jsonResponse(request, { items: records, total: records.length, warnings });
    }
    if (!path && request.method === 'POST') {
      const input = transactionSchema.parse(await request.json());
      return jsonResponse(
        request,
        mapFeishuRecord(await createRecord(config, toFeishuFields(input))).transaction,
        201,
      );
    }
    if (path === 'batch-status' && request.method === 'POST') {
      const input = batchStatusSchema.parse(await request.json());
      const results = await resultList(input.ids, (id) =>
        updateRecord(config, id, { 交易状态: input.status }),
      );
      return jsonResponse(request, { results });
    }
    if (path === 'batch-delete' && request.method === 'POST') {
      const input = batchDeleteSchema.parse(await request.json());
      return jsonResponse(request, {
        results: await resultList(input.ids, (id) => deleteRecord(config, id)),
      });
    }
    if (path && request.method === 'PUT') {
      const input = transactionSchema.parse(await request.json());
      return jsonResponse(
        request,
        mapFeishuRecord(await updateRecord(config, path, toFeishuFields(input))).transaction,
      );
    }
    if (path && request.method === 'DELETE') {
      await deleteRecord(config, path);
      return jsonResponse(request, { success: true });
    }
    return errorResponse(request, 404, 'NOT_FOUND', '接口不存在');
  } catch (error) {
    if (error instanceof z.ZodError)
      return errorResponse(
        request,
        400,
        'VALIDATION_ERROR',
        error.issues[0]?.message ?? '输入不合法',
      );
    return errorFromUnknown(request, error);
  }
};
