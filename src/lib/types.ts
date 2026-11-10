// Agent 类型定义
export type AgentType = 'orchestrator' | 'parse' | 'data' | 'report' | 'check';

export type NodeStatus = 'pending' | 'running' | 'done' | 'error' | 'retry';

export interface AgentNode {
  id: string;
  type: AgentType;
  name: string;
  description: string;
  status: NodeStatus;
  progress?: number; // 0-100
  message?: string;
  startTime?: number;
  endTime?: number;
  retryCount?: number;
  output?: string;
  recordIds?: string[];
  logs?: string[]; // 执行日志
}

export interface Plan {
  taskId: string;
  intent: string; // 意图识别结果
  tasks: TaskItem[];
}

export interface TaskItem {
  id: string;
  name: string;
  agent: AgentType;
  dependsOn: string[]; // 依赖的任务ID
  parallel: boolean; // 是否可并行
  status: NodeStatus;
}

// 引用/来源
export interface Citation {
  id: string;
  docId: string;
  docName: string;
  page: string;
  snippet: string;
  claimText?: string;
}

// 消息类型
export type MessageRole = 'user' | 'assistant' | 'system';
export type MessageStatus = 'streaming' | 'done' | 'error';

export interface ChatMessage {
  id: string;
  role: MessageRole;
  content: string;
  status: MessageStatus;
  timestamp: number;
  citations?: Citation[];
  files?: UploadedFile[];
  plan?: Plan;
  agentUpdates?: AgentUpdate[];
}

export interface AgentUpdate {
  agent: AgentType;
  status: NodeStatus;
  message: string;
  timestamp: number;
}

// 上传文件
export interface UploadedFile {
  id: string;
  name: string;
  size: number;
  type: 'pdf' | 'excel' | 'csv' | 'other';
  status: 'uploading' | 'parsing' | 'done' | 'error';
  progress: number;
  docId?: string; // L1 知识库ID
  error?: string;
}

// 会话
export interface Conversation {
  id: string;
  title: string;
  createdAt: number;
  updatedAt: number;
  messageCount: number;
}

// 知识库信息
export interface KnowledgeBase {
  id: string;
  name: string;
  level: 'L1' | 'L2' | 'L3';
  description: string;
  docCount: number;
}

// API 响应类型
export interface StreamEvent {
  event: 'message' | 'agent_update' | 'plan' | 'citation' | 'error' | 'done' | 'interrupt';
  data: unknown;
}
