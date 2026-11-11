import test from 'node:test';
import assert from 'node:assert/strict';
import { AGENT_CONFIGS } from '../../src/lib/agent-config';
import type { AgentType } from '../../src/lib/types';

const AGENTS: AgentType[] = ['orchestrator', 'parse', 'data', 'report', 'check'];

test('五类 Agent 配置齐全', () => {
  for (const agent of AGENTS) {
    const cfg = AGENT_CONFIGS[agent];
    assert.ok(cfg, `${agent} 缺少配置`);
    assert.ok(cfg.name.length > 0);
    assert.ok(cfg.shortName.length > 0);
    assert.match(cfg.color, /^var\(--agent-/, `${agent} 颜色应引用设计变量`);
  }
});

test('Agent 简称互不重复', () => {
  const shortNames = AGENTS.map(a => AGENT_CONFIGS[a].shortName);
  assert.equal(new Set(shortNames).size, shortNames.length);
});
