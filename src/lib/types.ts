export type AgentType = "orchestrator" | "parse" | "data" | "report" | "check";

export type NodeStatus = "idle" | "running" | "done" | "error";

export interface AgentStatus {
  status: NodeStatus;
  progress: number;
  message?: string;
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

export interface Citation {
  docId: string;
  page: string;
  text?: string;
  recordId?: string;
}

export type MessageRole = "user" | "assistant";

export type WorkflowResult =
  | { type: "data"; recordId: string; exceptionList: string; failed?: string }
  | { type: "parse"; recordIds?: string[] }
  | { type: "check"; passed: boolean; issues?: string[]; retryCount?: number }
  | { type: "report"; reportId?: string };

export interface Message {
  id: string;
  role: MessageRole;
  content: string;
  streaming?: boolean;
  thinking?: string;
  citations?: Citation[];
  files?: UploadedFile[];
  workflowResults?: WorkflowResult[];
  isReport?: boolean;
}

export interface UploadedFile {
  id: string;
  name: string;
  size: number;
  type: string;
  file?: File;
}

export interface Session {
  id: string;
  title: string;
  timestamp: string;
  messages?: Message[];
}

export interface ChatConfig {
  botConfigured: boolean;
  apiConfigured: boolean;
  mode: string;
  botId: string | null;
  workflows: Array<{ name: string; id: string | null; configured: boolean }>;
}

export interface SSEEvent {
  type: "plan" | "agent.status" | "agent.log" | "thinking" | "message.delta"
    | "citation.add" | "workflow.result" | "exception.list" | "check.result"
    | "report.done" | "done" | "kb.update" | "error";
  plan?: Plan;
  agent?: AgentType;
  status?: NodeStatus;
  message?: string;
  content?: string;
  log?: string;
  citation?: Citation;
  result?: unknown;
  issues?: string[];
  passed?: boolean;
  retryCount?: number;
  delta?: string;
  kb?: { level: "L1" | "L2" | "L3"; delta: number };
  error?: string;
  exceptions?: string[];
}
