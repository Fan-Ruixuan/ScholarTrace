import type { AgentType } from './types';

export interface AgentConfig {
  name: string;
  color: string;
  description: string;
}

export const AGENTS: Record<AgentType, AgentConfig> = {
  orchestrator: { name: '主控调度', color: '#2563eb', description: '意图识别与任务编排' },
  parse: { name: '文献解析', color: '#0891b2', description: '观点抽取与关键词聚类' },
  data: { name: '数据处理', color: '#059669', description: '清洗与异常标注' },
  report: { name: '报告生成', color: '#d97706', description: '模板组装与初稿输出' },
  check: { name: '合规校验', color: '#dc2626', description: '来源回溯与逻辑校验' },
};

export function getAgentName(type: AgentType): string {
  return AGENTS[type].name;
}

export function getAgentColor(type: AgentType): string {
  return AGENTS[type].color;
}
