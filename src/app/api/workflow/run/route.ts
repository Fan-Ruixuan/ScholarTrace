// 子工作流直接执行接口 - 支持手动触发单个Agent测试
import { NextRequest } from 'next/server';
import { WORKFLOW_IDS, isApiConfigured } from '@/lib/coze-api';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const COZE_API_BASE = process.env.COZE_API_BASE_URL || 'https://api.coze.cn';
const COZE_API_TOKEN = process.env.COZE_WORKLOAD_API_TOKEN || '';

export async function GET() {
  return Response.json({
    status: 'ok',
    apiConfigured: isApiConfigured,
    workflows: {
      parse: WORKFLOW_IDS.parse,
      data: WORKFLOW_IDS.data,
      report: WORKFLOW_IDS.report,
      check: WORKFLOW_IDS.check,
    },
  });
}

export async function POST(req: NextRequest) {
  const { workflow, parameters = {} } = await req.json();

  const workflowId = WORKFLOW_IDS[workflow as keyof typeof WORKFLOW_IDS];
  if (!workflowId) {
    return Response.json({ error: `未知工作流: ${workflow}，可选值: parse/data/report/check` }, { status: 400 });
  }

  if (!COZE_API_TOKEN) {
    return Response.json({ error: 'API Token 未配置' }, { status: 503 });
  }

  try {
    const response = await fetch(`${COZE_API_BASE}/v1/workflow/run`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${COZE_API_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ workflow_id: workflowId, parameters }),
    });

    const data = await response.json();
    return Response.json({ workflow, workflowId, result: data });
  } catch (err) {
    return Response.json({ error: (err as Error).message }, { status: 500 });
  }
}
