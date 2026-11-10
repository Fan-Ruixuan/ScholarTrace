export type AgentType = "orchestrator" | "parse" | "data" | "report" | "check";
export type NodeStatus = "idle" | "running" | "done" | "error";

export interface AgentStatus {
  status: NodeStatus;
  progress: number;
  message?: string;
  output?: Record<string, unknown>;
}

export interface AgentConfig {
  name: string;
  shortName: string;
  description: string;
}

export const AGENT_COLORS: Record<AgentType, string> = {
  orchestrator: "#4f7cff",
  parse: "#22b8cf",
  data: "#38d9a9",
  report: "#fdc23b",
  check: "#ff6b6b",
};

export const AGENTS: Record<AgentType, AgentConfig> = {
  orchestrator: {
    name: "主控调度 Agent",
    shortName: "主控",
    description: "意图识别 · 任务拆解 · 分发调度",
  },
  parse: {
    name: "文献解析 Agent",
    shortName: "解析",
    description: "批量解析 · 观点抽取 · 关键词聚类",
  },
  data: {
    name: "数据处理 Agent",
    shortName: "数据",
    description: "数据清洗 · 格式标准化 · 异常标注",
  },
  report: {
    name: "报告生成 Agent",
    shortName: "报告",
    description: "模板组装 · 引用标注 · 初稿生成",
  },
  check: {
    name: "合规校验 Agent",
    shortName: "校验",
    description: "来源回溯 · 逻辑校验 · 质量兜底",
  },
};

export const WORKFLOW_MAP: Record<string, AgentType> = {
  parse: "parse",
  data: "data",
  report: "report",
  check: "check",
};
