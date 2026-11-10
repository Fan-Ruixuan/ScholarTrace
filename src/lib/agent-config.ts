// Agent配置：名称、颜色、图标
import type { AgentType } from './types';

export interface AgentConfig {
  name: string;
  color: string;
  shortName: string;
  description: string;
}

export const AGENT_CONFIGS: Record<AgentType, AgentConfig> = {
  orchestrator: {
    name: '主控调度',
    shortName: '主控',
    color: 'var(--agent-orchestrator)',
    description: '意图识别 · 任务编排 · 调度分发',
  },
  parse: {
    name: '文献解析',
    shortName: '解析',
    color: 'var(--agent-parse)',
    description: '批量解析 · 观点抽取 · 关键词聚类',
  },
  data: {
    name: '数据处理',
    shortName: '数据',
    color: 'var(--agent-data)',
    description: '数据清洗 · 格式标准化 · 异常标注',
  },
  report: {
    name: '报告生成',
    shortName: '报告',
    color: 'var(--agent-report)',
    description: '模板组装 · 引用指针 · 初稿生成',
  },
  check: {
    name: '合规校验',
    shortName: '校验',
    color: 'var(--agent-check)',
    description: '来源回溯 · 格式校验 · 逻辑一致性',
  },
};
