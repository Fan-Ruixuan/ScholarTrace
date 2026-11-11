import test from 'node:test';
import assert from 'node:assert/strict';
import { recognizeIntent } from '../../src/lib/coze-api';

test('文献解析指令 → parse_only，只调度解析 Agent', () => {
  const plan = recognizeIntent('帮我解析这篇文献的核心观点', false);
  assert.equal(plan.intent, 'parse_only');
  assert.deepEqual(plan.tasks.map(t => t.agent), ['parse']);
});

test('数据清洗指令 → data_only', () => {
  const plan = recognizeIntent('帮我清洗实验数据并标注异常', false);
  assert.equal(plan.intent, 'data_only');
  assert.deepEqual(plan.tasks.map(t => t.agent), ['data']);
});

test('报告指令 → full_pipeline，报告后接合规校验', () => {
  const plan = recognizeIntent('帮我解析这篇文献并生成报告', false);
  assert.equal(plan.intent, 'full_pipeline');
  assert.ok(plan.tasks.some(t => t.agent === 'report'));
  assert.ok(plan.tasks.some(t => t.agent === 'check'));
});

test('上传文件自动触发解析 + 数据处理并行', () => {
  const plan = recognizeIntent('请处理这些材料', true);
  assert.equal(plan.intent, 'full_pipeline');
  const parallel = plan.tasks.filter(t => t.parallel).map(t => t.agent);
  assert.deepEqual(parallel.sort(), ['data', 'parse']);
});

test('纯提问 → qa，不误触发工作流', () => {
  const plan = recognizeIntent('为什么需要引用指针？', false);
  assert.equal(plan.intent, 'qa');
  assert.equal(plan.tasks.length, 0);
});
