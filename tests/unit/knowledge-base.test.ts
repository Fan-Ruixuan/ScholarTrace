import test from 'node:test';
import assert from 'node:assert/strict';
import { KB_ENTRIES, KB_LAYER_META, type KBLayer } from '../../src/lib/knowledge-base';

const LAYERS: KBLayer[] = ['L1', 'L2', 'L3'];

test('三层知识库定位信息完整', () => {
  for (const layer of LAYERS) {
    const meta = KB_LAYER_META[layer];
    assert.ok(meta.fullName.includes(layer), `${layer} 应包含层号`);
    assert.ok(meta.purpose.length > 10, `${layer} 定位说明过短`);
    assert.ok(meta.policy.length > 0);
    assert.ok(meta.format.length > 0);
  }
});

test('每层都有可查看的存量内容', () => {
  for (const layer of LAYERS) {
    assert.ok(KB_ENTRIES[layer].length >= 3, `${layer} 内容条目不足`);
  }
});

test('知识库条目 ID 全局唯一', () => {
  const ids = LAYERS.flatMap(l => KB_ENTRIES[l].map(e => e.id));
  assert.equal(new Set(ids).size, ids.length, '存在重复 ID');
});

test('条目结构字段完整', () => {
  for (const layer of LAYERS) {
    for (const entry of KB_ENTRIES[layer]) {
      assert.ok(entry.id.length > 0);
      assert.ok(entry.title.length > 0);
      assert.ok(entry.meta.length > 0);
      assert.ok(entry.excerpt.length > 20, `${entry.id} 摘要过短`);
    }
  }
});

test('L2 条目使用 record_id，L3 条目使用规则编号', () => {
  assert.ok(KB_ENTRIES.L2.every(e => /^REC-/.test(e.id)), 'L2 应为 record_id');
  assert.ok(KB_ENTRIES.L3.every(e => /^R-\d+/.test(e.id)), 'L3 应为规则编号');
});
