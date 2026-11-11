// ============ 消息与对话类型 ============

export type AgentType = 'orchestrator' | 'parse' | 'data' | 'report' | 'check';

export interface Message {
  id: string;
  role: 'user' | 'agent';
  content: string;
  thinking?: string;
  agent?: AgentType;
  timestamp: string;
  result?: WorkflowResult;
}

export interface Citation {
  id: string;
  index: number;
  docId: string;
  page: string;
  snippet: string;
}

export interface UploadedFile {
  id: string;
  name: string;
  type: 'pdf' | 'data' | 'other';
}

// ============ 工作流/Agent类型 ============

export interface AgentState {
  status: 'idle' | 'pending' | 'running' | 'done' | 'error' | 'retry';
  message: string;
  progress: number;
  logs: string[];
  recordIds?: string[];
  output?: string;
  retryCount?: number;
}

export interface PlanTask {
  agent: AgentType;
  dependsOn: AgentType[];
  parallel: boolean;
  description: string;
}

export interface Plan {
  intent: string;
  description: string;
  tasks: PlanTask[];
}

export interface AgentLog {
  agent: AgentType;
  log: string;
  time: string;
}

export interface WorkflowResult {
  type: 'parse' | 'data' | 'report' | 'check';
  data: {
    recordId?: string;
    recordIdList?: string[];
    exceptionList?: string[];
    reportContent?: string;
    reportId?: string;
    passed?: boolean;
    issueList?: string[];
    retryCount?: number;
    rowsCleaned?: string;
    feedback?: string;
    [key: string]: unknown;
  };
}

// ============ 时间轴回放类型 ============

/** 编排引擎 emit 的统一时间线事件，所有事件都带精确毫秒级时间戳 */
export type TimelineEvent =
  // 节点状态变化（回放时让拓扑节点切换样式）
  | {
      kind: 'node.status';
      ts: number;
      agent: AgentType;
      status: AgentState['status'];
      message?: string;
      progress?: number;
    }
  // 数据流动：record_id 从 A Agent 传到 B Agent（回放时让连线上飞过标签）
  | {
      kind: 'flow.pointer';
      ts: number;
      from: AgentType;
      to: AgentType;
      recordId: string;
    }
  // 知识库访问：回放时让知识库同心环上有数据点飞入
  | {
      kind: 'kb.access';
      ts: number;
      layer: 'L1' | 'L2' | 'L3';
      action: 'read' | 'write';
      detail: string;
    }
  // 执行日志：回放时填充日志流
  | {
      kind: 'agent.log';
      ts: number;
      agent: AgentType;
      log: string;
    }
  // 校验闭环重试
  | {
      kind: 'retry.loop';
      ts: number;
      toAgent: AgentType;
      reason: string;
    }
  // 完成标记
  | {
      kind: 'done';
      ts: number;
    };

// ============ 课题分组 / 会话类型 ============

export interface Session {
  id: string;
  title: string;
  groupId: string;
  active?: boolean;
  createdAt: number;
}

export interface SessionGroup {
  id: string;
  name: string;
  collapsed: boolean;
  color?: string;
}
