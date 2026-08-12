import { parseEnv } from '../../../_shared/env';
import { requireUser } from '../../../_shared/auth';
import { listRecords } from '../../../_shared/feishu';
import { errorFromUnknown, errorResponse, jsonResponse } from '../../../_shared/http';

export const onRequestGet: PagesFunction = async ({ request, env }) => {
  try {
    const config = parseEnv(env);
    if (!(await requireUser(request, config)))
      return errorResponse(request, 401, 'UNAUTHENTICATED', '请重新登录');
    await listRecords(config);
    return jsonResponse(request, { connected: true, checkedAt: new Date().toISOString() });
  } catch (error) {
    return errorFromUnknown(request, error);
  }
};
