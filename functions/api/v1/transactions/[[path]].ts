import { z } from 'zod';
import { parseEnv } from '../../../_shared/env';
import { requireUser } from '../../../_shared/auth';
import { createRecord, deleteRecord, listRecords, updateRecord } from '../../../_shared/feishu';
import { errorFromUnknown, errorResponse, jsonResponse } from '../../../_shared/http';
import {
  fromFeishuRecord,
  toFeishuFields,
  transactionSchema,
  TRANSACTION_STATUSES,
} from '../../../../src/domain/transaction';

const querySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  q: z.string().trim().default(''),
  status: z.enum(TRANSACTION_STATUSES).optional(),
  category: z.string().trim().optional(),
  from: z.string().date().optional(),
  to: z.string().date().optional(),
  sort: z
    .enum(['transactionDate', 'title', 'salePrice', 'costPrice', 'profit', 'status'])
    .default('transactionDate'),
  order: z.enum(['asc', 'desc']).default('desc'),
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

    if (!path && request.method === 'GET') {
      const query = querySchema.parse(Object.fromEntries(new URL(request.url).searchParams));
      const warnings: string[] = [];
      const records = (await listRecords(config)).flatMap((record) => {
        try {
          return [fromFeishuRecord(record)];
        } catch (error) {
          warnings.push(error instanceof Error ? error.message : '数据映射失败');
          return [];
        }
      });
      const q = query.q.toLocaleLowerCase('zh-CN');
      const filtered = records.filter(
        (record) =>
          (!q || `${record.title} ${record.note}`.toLocaleLowerCase('zh-CN').includes(q)) &&
          (!query.status || record.status === query.status) &&
          (!query.category || record.category === query.category) &&
          (!query.from || record.transactionDate >= query.from) &&
          (!query.to || record.transactionDate <= query.to),
      );
      filtered.sort((a, b) => {
        const left = a[query.sort];
        const right = b[query.sort];
        const result =
          typeof left === 'number' && typeof right === 'number'
            ? left - right
            : String(left ?? '').localeCompare(String(right ?? ''), 'zh-CN');
        return query.order === 'asc' ? result : -result;
      });
      const start = (query.page - 1) * query.pageSize;
      return jsonResponse(request, {
        items: filtered.slice(start, start + query.pageSize),
        total: filtered.length,
        page: query.page,
        pageSize: query.pageSize,
        categories: [...new Set(records.map((record) => record.category))].sort(),
        warnings,
      });
    }
    if (!path && request.method === 'POST') {
      const input = transactionSchema.parse(await request.json());
      return jsonResponse(
        request,
        fromFeishuRecord(await createRecord(config, toFeishuFields(input))),
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
        fromFeishuRecord(await updateRecord(config, path, toFeishuFields(input))),
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
