// 主对话流 SSE 接口 - 溯研主控编排模式
import { NextRequest } from 'next/server';
import {
  runOrchestrator,
  isApiConfigured,
  isBotConfigured,
  WORKFLOW_IDS,
  getWorkflowConfigured,
  COZE_BOT_ID,
  type OrchestratorEvent,
} from '@/lib/coze-api';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// SSE 响应头
const SSE_HEADERS = {
  'Content-Type': 'text/event-stream; charset=utf-8',
  'Cache-Control': 'no-cache, no-transform',
  'Connection': 'keep-alive',
  'X-Accel-Buffering': 'no',
};

function serializeEvent(event: OrchestratorEvent): string {
  return `data: ${JSON.stringify(event)}\n\n`;
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const message: string = body.message || '';
  const files: Array<{ id: string; name: string; url?: string }> = body.files || [];

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: OrchestratorEvent) => {
        controller.enqueue(encoder.encode(serializeEvent(event)));
      };

      const abortController = new AbortController();
      req.signal.addEventListener('abort', () => abortController.abort());

      try {
        // 主控编排模式（直接调用4个子工作流）
        const orchStream = runOrchestrator({
          message,
          files,
          signal: abortController.signal,
        });
        const reader = orchStream.getReader();
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          send(value);
        }
      } catch (err) {
        send({ type: 'error', msg: (err as Error).message });
      } finally {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'done' })}\n\n`));
        controller.enqueue(encoder.encode('data: [DONE]\n\n'));
        controller.close();
      }
    },
  });

  return new Response(stream, { headers: SSE_HEADERS });
}

// GET 用于预检/配置检查
export async function GET() {
  return Response.json({
    botId: COZE_BOT_ID || null,
    botConfigured: isBotConfigured,
    apiConfigured: isApiConfigured,
    mode: isBotConfigured ? 'bot' : 'orchestrator',
    workflows: [
      { name: 'parse', id: WORKFLOW_IDS.parse, configured: getWorkflowConfigured('parse') },
      { name: 'data', id: WORKFLOW_IDS.data, configured: getWorkflowConfigured('data') },
      { name: 'report', id: WORKFLOW_IDS.report, configured: getWorkflowConfigured('report') },
      { name: 'check', id: WORKFLOW_IDS.check, configured: getWorkflowConfigured('check') },
    ],
  });
}
