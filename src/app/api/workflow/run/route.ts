import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const COZE_API_BASE = process.env.COZE_API_BASE_URL || 'https://api.coze.cn';
const COZE_API_TOKEN = process.env.COZE_WORKLOAD_API_TOKEN || '';

const WORKFLOW_MAP: Record<string, string | undefined> = {
  parse: process.env.WORKFLOW_PARSE_ID,
  data: process.env.WORKFLOW_DATA_ID,
  report: process.env.WORKFLOW_REPORT_ID,
  check: process.env.WORKFLOW_CHECK_ID,
};

/**
 * 执行专项子工作流 API
 * POST /api/workflow/run
 * body: { workflow: 'parse'|'data'|'report'|'check', parameters: {...}, stream?: boolean }
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { workflow, parameters = {}, stream = true } = body;

    const workflowId = WORKFLOW_MAP[workflow];
    if (!workflowId) {
      return NextResponse.json(
        {
          error: `工作流「${workflow}」未配置ID。请在 .env 中设置 WORKFLOW_${workflow.toUpperCase()}_ID，或先在Coze平台发布对应工作流。`,
          code: 'WORKFLOW_NOT_CONFIGURED',
        },
        { status: 400 },
      );
    }

    if (!COZE_API_TOKEN) {
      return NextResponse.json(
        { error: 'COZE_WORKLOAD_API_TOKEN 未配置' },
        { status: 500 },
      );
    }

    const endpoint = stream ? '/v1/workflow/stream_run' : '/v1/workflow/run';
    const response = await fetch(`${COZE_API_BASE}${endpoint}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${COZE_API_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        workflow_id: workflowId,
        parameters,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      return NextResponse.json(
        { error: `Workflow error ${response.status}: ${errorText}` },
        { status: response.status },
      );
    }

    // 流式响应
    if (stream && response.body) {
      // 将Coze的SSE流转为我们统一格式
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      const encoder = new TextEncoder();

      const transformStream = new ReadableStream({
        async start(controller) {
          let buffer = '';
          try {
            while (true) {
              const { done, value } = await reader.read();
              if (done) break;
              buffer += decoder.decode(value, { stream: true });
              const lines = buffer.split('\n');
              buffer = lines.pop() || '';

              for (const line of lines) {
                const trimmed = line.trim();
                if (!trimmed || !trimmed.startsWith('data:')) continue;
                const dataStr = trimmed.slice(5).trim();
                if (dataStr === '[DONE]') {
                  controller.enqueue(encoder.encode('data: [DONE]\n\n'));
                  break;
                }
                // 直接透传SSE数据
                controller.enqueue(encoder.encode(`data: ${dataStr}\n\n`));
              }
            }
          } catch (err) {
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ error: (err as Error).message })}\n\n`));
          } finally {
            controller.close();
          }
        },
      });

      return new Response(transformStream, {
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive',
        },
      });
    }

    // 非流式：直接返回结果
    const result = await response.json();
    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json(
      { error: (err as Error).message },
      { status: 500 },
    );
  }
}

/**
 * 查询工作流配置状态
 */
export async function GET() {
  const configStatus = Object.entries(WORKFLOW_MAP).map(([name, id]) => ({
    name,
    configured: !!id,
    id: id || null,
  }));

  return NextResponse.json({
    botId: process.env.COZE_BOT_ID || '7572136020375916603',
    apiConfigured: !!COZE_API_TOKEN,
    workflows: configStatus,
  });
}
