import { parseEnv } from '../../../_shared/env';
import { requireUser } from '../../../_shared/auth';
import { listRecords } from '../../../_shared/feishu';
import { errorFromUnknown, errorResponse, jsonResponse } from '../../../_shared/http';
import { fromFeishuRecord } from '../../../../src/domain/transaction';
import { summarizeTransactions } from '../../../../src/domain/analytics';

export const onRequestGet: PagesFunction = async ({ request, env }) => {
  try {
    const config = parseEnv(env);
    if (!(await requireUser(request, config)))
      return errorResponse(request, 401, 'UNAUTHENTICATED', '请重新登录');
    const url = new URL(request.url);
    const from = url.searchParams.get('from');
    const to = url.searchParams.get('to');
    const records = (await listRecords(config))
      .flatMap((record) => {
        try {
          return [fromFeishuRecord(record)];
        } catch {
          return [];
        }
      })
      .filter(
        (record) =>
          (!from || record.transactionDate >= from) && (!to || record.transactionDate <= to),
      );
    return jsonResponse(request, summarizeTransactions(records));
  } catch (error) {
    return errorFromUnknown(request, error);
  }
};
