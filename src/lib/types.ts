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
