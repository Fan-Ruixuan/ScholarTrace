import { NextRequest, NextResponse } from 'next/server';
import { streamChat, ChatEvent } from '@/lib/coze-api';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 300;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { message, conversationId, files } = body;

    if (!message || typeof message !== 'string') {
      return NextResponse.json({ error: '消息不能为空' }, { status: 400 });
    }

    const eventStream = await streamChat({
      message,
      conversationId,
      files,
      userId: 'web_user',
    });

    const encoder = new TextEncoder();

    const stream = new ReadableStream({
      async start(controller) {
        const reader = eventStream.getReader();
        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            const event = value as ChatEvent;
            const sseData = `data: ${JSON.stringify(event)}\n\n`;
            controller.enqueue(encoder.encode(sseData));
          }
        } catch (err) {
          const errorEvent = `data: ${JSON.stringify({ type: 'error', msg: (err as Error).message })}\n\n`;
          controller.enqueue(encoder.encode(errorEvent));
        } finally {
          controller.enqueue(encoder.encode('data: [DONE]\n\n'));
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache, no-transform',
        'Connection': 'keep-alive',
        'X-Accel-Buffering': 'no',
      },
    });
  } catch (err) {
    return NextResponse.json(
      { error: (err as Error).message },
      { status: 500 },
    );
  }
}
