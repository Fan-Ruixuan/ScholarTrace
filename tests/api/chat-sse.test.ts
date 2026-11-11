import test from 'node:test';
import assert from 'node:assert/strict';
import type { NextRequest } from 'next/server';
import { POST } from '../../src/app/api/chat/route';

type Evt = Record<string, unknown> & { type: string };

/** 直接调用 Route Handler，消费 SSE 流并解析为事件数组 */
async function runChat(message: string): Promise<Evt[]> {
  const req = new Request('http://localhost/api/chat', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ message, files: [] }),
  });
  const res = await POST(req as unknown as NextRequest);
  assert.equal(res.status, 200);
  assert.match(res.headers.get('content-type') || '', /text\/event-stream/);

  const text = await res.text();
  return text
    .split('\n\n')
    .map(block => block.trim())
    .filter(Boolean)
    .map(block => block.replace(/^data:\s*/, ''))
    .filter(payload => payload && payload !== '[DONE]')
    .map(payload => JSON.parse(payload) as Evt);
}

test('全链路：解析 → 报告 → 校验，事件完整且可溯源', { timeout: 20000 }, async () => {
  const events = await runChat('帮我解析这篇文献并生成报告');
  const types = events.map(e => e.type);

  const planEvent = events.find(e => e.type === 'plan');
  assert.ok(planEvent, '缺少 plan 事件');
  const plan = planEvent.plan as { tasks: { agent: string }[] };
  assert.ok(plan.tasks.length >= 2);

  const doneAgents = events
    .filter(e => e.type === 'agent.status' && e.status === 'done')
    .map(e => e.agent as string);
  for (const agent of ['parse', 'report', 'check']) {
    assert.ok(doneAgents.includes(agent), `${agent} 未完成`);
  }

  const kbLayers = new Set(events.filter(e => e.type === 'knowledge.access').map(e => e.layer));
  for (const layer of ['L1', 'L2', 'L3']) {
    assert.ok(kbLayers.has(layer), `未访问 ${layer}`);
  }

  const citations = events.filter(e => e.type === 'citation.added');
  assert.ok(citations.length >= 1, '没有生成引用');
  const report = events.find(e => e.type === 'report.ready');
  assert.ok(report, '缺少 report.ready');
  assert.ok((report.citations as unknown[]).length >= 1, '报告未携带引用');

  assert.equal(types[types.length - 1], 'done');
  assert.equal(types.filter(t => t === 'error').length, 0, '不应出现 error 事件');
});

test('开场文案保持克制：不再堆叠长段解释', { timeout: 20000 }, async () => {
  const events = await runChat('帮我解析这篇文献并生成报告');
  const firstDelta = events.find(e => e.type === 'message.delta');
  assert.ok(firstDelta, '缺少开场消息');
  const content = String(firstDelta.content);
  assert.ok(content.length <= 60, `开场消息过长：${content.length} 字`);
  assert.ok(!content.includes('收到您的请求'), '开场仍包含冗余客套话');
});

test('问答意图不触发 Agent 工作流', { timeout: 20000 }, async () => {
  const events = await runChat('为什么需要引用指针？');
  const planEvent = events.find(e => e.type === 'plan');
  assert.equal((planEvent?.plan as { intent: string }).intent, 'qa');
  assert.equal(events.filter(e => e.type === 'agent.status' && e.status === 'done').length, 1);
  assert.ok(events.some(e => e.type === 'message.delta'));
  assert.equal(events[events.length - 1].type, 'done');
});
