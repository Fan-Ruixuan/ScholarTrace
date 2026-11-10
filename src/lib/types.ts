// Agent 类型定义
export type AgentType = 'orchestrator' | 'parse' | 'data' | 'report' | 'check';

export type NodeStatus = 'pending' | 'running' | 'done' | 'error';

export interface AgentNode {
  id: string;
  type: AgentType;
  name: string;
  description: string;
  status: NodeStatus;
  progress: number;
  logs: string[];
  output?: Record<string, unknown>;
}

export interface PlanTask {
  agent: AgentType;
  description: string;
  dependsOn: AgentType[];
  parallel?: boolean;
}

export interface Plan {
  intent: string;
  description: string;
  tasks: PlanTask[];
}

// 引用/来源
export interface Citation {
  id: string;
  docId: string;
  page?: string;
  snippet?: string;
}

// 消息类型
export type MessageRole = 'user' | 'assistant';

export interface ChatMessage {
  id: string;
  role: MessageRole;
  content: string;
  streaming?: boolean;
  citations?: Citation[];
  exceptions?: string[];
  checkResult?: { passed: boolean; issues?: string[]; retryCount?: number };
}

// 上传文件
export interface UploadedFile {
  id: string;
  name: string;
  size: number;
  type: string;
  file?: File;
}

// 知识库信息
export interface KnowledgeBase {
  level: 'L1' | 'L2' | 'L3';
  name: string;
  desc: string;
  count: number;
}
