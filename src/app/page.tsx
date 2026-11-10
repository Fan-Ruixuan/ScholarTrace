'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { Sidebar } from '@/components/Sidebar';
import { TopBar } from '@/components/TopBar';
import { MessageList } from '@/components/MessageList';
import { ChatInput } from '@/components/ChatInput';
import { WorkflowPanel } from '@/components/WorkflowPanel';
import { ReportViewer } from '@/components/ReportViewer';
import { ChatMessage, AgentNode, AgentType, Plan, UploadedFile, Citation } from '@/lib/types';
import { getAgentName } from '@/lib/agent-config';
import type { OrchestratorEvent, ExecutionPlan } from '@/lib/coze-api';

// 初始Agent节点状态（对应调度泳道图）
function createInitialNodes(): AgentNode[] {
  return [
    {
      id: 'orchestrator',
      type: 'orchestrator',
      name: getAgentName('orchestrator'),
      description: '意图识别、任务拆解与调度',
      status: 'pending',
      logs: [],
    },
    {
      id: 'parse',
      type: 'parse',
      name: getAgentName('parse'),
      description: '批量解析文献、抽取观点',
      status: 'pending',
      logs: [],
    },
    {
      id: 'data',
      type: 'data',
      name: getAgentName('data'),
      description: '数据清洗、异常标注',
      status: 'pending',
      logs: [],
    },
    {
      id: 'report',
      type: 'report',
      name: getAgentName('report'),
      description: '按模板组装报告初稿',
      status: 'pending',
      logs: [],
    },
    {
      id: 'check',
      type: 'check',
      name: getAgentName('check'),
      description: '来源回溯、逻辑校验',
      status: 'pending',
      logs: [],
    },
  ];
}

// 知识库访问状态
interface KBState {
  L1: { lastAction?: string; lastDetail?: string; accessed: boolean };
  L2: { lastAction?: string; lastDetail?: string; accessed: boolean };
  L3: { lastAction?: string; lastDetail?: string; accessed: boolean };
}

export default function ChatPage() {
  const [conversations, setConversations] = useState<Array<{ id: string; title: string; updatedAt: number }>>([
    { id: 'default', title: '欢迎使用溯研', updatedAt: Date.now() },
  ]);
  const [activeConversationId, setActiveConversationId] = useState('default');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [nodes, setNodes] = useState<AgentNode[]>(createInitialNodes());
  const [plan, setPlan] = useState<Plan | undefined>();
  const [currentAgent, setCurrentAgent] = useState<AgentType | undefined>();
  const [isLoading, setIsLoading] = useState(false);
  const [showReport, setShowReport] = useState(false);
  const [reportContent, setReportContent] = useState('');
  const [reportCitations, setReportCitations] = useState<Citation[]>([]);
  const [kbState, setKbState] = useState<KBState>({
    L1: { accessed: false }, L2: { accessed: false }, L3: { accessed: false },
  });
  const [retryInfo, setRetryInfo] = useState<{ from: AgentType; to: AgentType; reason: string; count: number } | null>(null);
  const [apiStatus, setApiStatus] = useState<{
    configured: boolean; mode: string; workflows: Record<string, boolean>;
  } | null>(null);

  const abortControllerRef = useRef<AbortController | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // 检查API配置状态
  useEffect(() => {
    fetch('/api/chat').then(r => r.json()).then(data => {
      setApiStatus({
        configured: data.apiConfigured,
        mode: data.mode,
        workflows: Object.fromEntries(data.workflows.map((w: { name: string; configured: boolean }) => [w.name, w.configured])),
      });
    }).catch(() => {});
  }, []);

  // 滚动到底部
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const resetNodes = useCallback(() => {
    setNodes(createInitialNodes());
    setPlan(undefined);
    setCurrentAgent(undefined);
    setRetryInfo(null);
    setKbState({ L1: { accessed: false }, L2: { accessed: false }, L3: { accessed: false } });
  }, []);

  const updateNode = useCallback((type: AgentType, updates: Partial<AgentNode>) => {
    setNodes(prev => prev.map(n => n.type === type ? {
      ...n,
      ...updates,
      logs: updates.logs ? [...(n.logs || []), ...updates.logs] : n.logs,
    } : n));
  }, []);

  const appendLog = useCallback((type: AgentType, log: string) => {
    setNodes(prev => prev.map(n => n.type === type ? {
      ...n,
      logs: [...(n.logs || []), `[${new Date().toLocaleTimeString()}] ${log}`],
    } : n));
  }, []);

  const handleSend = useCallback(async (message: string, files: UploadedFile[]) => {
    if (isLoading) return;

    // 添加用户消息
    const userMsg: ChatMessage = {
      id: Math.random().toString(36).slice(2),
      role: 'user',
      content: message,
      status: 'done',
      timestamp: Date.now(),
      files: files.length > 0 ? files : undefined,
    };
    setMessages(prev => [...prev, userMsg]);

    if (messages.length === 0) {
      setConversations(prev => prev.map(c =>
        c.id === activeConversationId ? { ...c, title: message.slice(0, 20), updatedAt: Date.now() } : c,
      ));
    }

    resetNodes();
    setIsLoading(true);
    setReportContent('');
    setReportCitations([]);

    abortControllerRef.current = new AbortController();

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message,
          files: files.map(f => ({ id: f.docId || f.id, name: f.name })),
        }),
        signal: abortControllerRef.current.signal,
      });

      if (!response.ok || !response.body) {
        throw new Error(`请求失败: ${response.status}`);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      const assistantMsgId = Math.random().toString(36).slice(2);
      let assistantContent = '';
      let assistantCitations: Citation[] = [];

      // 初始助手消息
      setMessages(prev => [...prev, {
        id: assistantMsgId,
        role: 'assistant',
        content: '',
        status: 'streaming',
        timestamp: Date.now(),
      }]);

      const appendContent = (text: string) => {
        assistantContent += text;
        setMessages(prev => prev.map(m => m.id === assistantMsgId ? { ...m, content: assistantContent } : m));
      };

      const processEvent = (event: OrchestratorEvent) => {
        switch (event.type) {
          case 'plan': {
            const ep: ExecutionPlan = event.plan;
            const planTasks = ep.tasks.map((t, i) => ({
              id: `t_${i}`,
              name: t.description,
              agent: t.agent,
              dependsOn: t.dependsOn.map((d, j) => `t_dep_${j}`),
              parallel: t.parallel,
              status: 'pending' as const,
            }));
            setPlan({ taskId: `task_${Date.now()}`, intent: ep.description, tasks: planTasks });
            break;
          }

          case 'thinking':
            appendLog('orchestrator', event.content);
            break;

          case 'agent.status':
            setCurrentAgent(event.agent);
            updateNode(event.agent, {
              status: event.status,
              message: event.message,
              ...(event.status === 'running' ? { startTime: Date.now() } : {}),
              ...(event.status === 'done' || event.status === 'error' ? { endTime: Date.now() } : {}),
            });
            if (event.message) {
              appendLog(event.agent, `[${event.status}] ${event.message}`);
            }
            // 更新plan中对应任务状态
            setPlan(prev => {
              if (!prev) return prev;
              return {
                ...prev,
                tasks: prev.tasks.map(t =>
                  t.agent === event.agent
                    ? { ...t, status: event.status === 'done' ? 'done' as const : event.status === 'running' ? 'running' as const : event.status === 'error' ? 'error' as const : t.status }
                    : t
                ),
              };
            });
            break;

          case 'agent.log':
            appendLog(event.agent, event.log);
            break;

          case 'agent.progress':
            updateNode(event.agent, { progress: event.progress });
            break;

          case 'agent.output':
            updateNode(event.agent, { output: event.output, recordIds: event.recordIds });
            if (event.output) {
              appendContent(`\n${event.output}\n`);
            }
            break;

          case 'message.delta':
            appendContent(event.content);
            break;

          case 'message.done':
            break;

          case 'knowledge.access':
            setKbState(prev => ({
              ...prev,
              [event.layer]: {
                accessed: true,
                lastAction: event.action,
                lastDetail: event.detail,
              },
            }));
            break;

          case 'citation.added':
            assistantCitations.push({
              id: event.citation.id,
              docId: event.citation.docId,
              docName: `文献 ${event.citation.docId}`,
              page: event.citation.page,
              snippet: event.citation.claim,
            });
            break;

          case 'report.ready':
            setReportContent(event.report);
            setReportCitations(event.citations.length ? event.citations.map(c => ({
              id: c.id, docId: c.docId, docName: `文献 ${c.docId}`, page: c.page, snippet: c.claim,
            })) : assistantCitations);
            setMessages(prev => prev.map(m => m.id === assistantMsgId ? { ...m, citations: assistantCitations } : m));
            break;

          case 'retry.loop':
            setRetryInfo({ from: event.fromAgent, to: event.toAgent, reason: event.reason, count: event.count });
            updateNode(event.toAgent, { retryCount: event.count });
            break;

          case 'error':
            appendContent(`\n\n❌ **错误**: ${event.msg}\n`);
            if (event.agent) {
              updateNode(event.agent, { status: 'error', message: event.msg });
            }
            break;

          case 'done':
            break;
        }
      };

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed.startsWith('data: ')) continue;
          const dataStr = trimmed.slice(6).trim();
          if (dataStr === '[DONE]') {
            setIsLoading(false);
            setMessages(prev => prev.map(m => m.id === assistantMsgId ? {
              ...m,
              status: 'done',
              citations: assistantCitations,
            } : m));
            setCurrentAgent(undefined);
            return;
          }
          try {
            const event = JSON.parse(dataStr) as OrchestratorEvent;
            processEvent(event);
          } catch {
            // ignore
          }
        }
      }
    } catch (err) {
      const errMsg = (err as Error).name === 'AbortError' ? '生成已停止' : (err as Error).message;
      setMessages(prev => {
        const last = prev[prev.length - 1];
        if (last?.role === 'assistant' && last.status === 'streaming') {
          return prev.map(m => m.id === last.id ? { ...m, content: m.content + `\n\n${(err as Error).name === 'AbortError' ? '⏹️ 已停止生成' : `❌ ${errMsg}`}`, status: 'error' } : m);
        }
        return [...prev, {
          id: Math.random().toString(36).slice(2),
          role: 'assistant',
          content: `❌ 请求失败：${errMsg}`,
          status: 'error',
          timestamp: Date.now(),
        }];
      });
    } finally {
      setIsLoading(false);
      setCurrentAgent(undefined);
    }
  }, [isLoading, messages.length, activeConversationId, resetNodes, updateNode, appendLog]);

  const handleStop = useCallback(() => {
    abortControllerRef.current?.abort();
  }, []);

  const handleNewChat = useCallback(() => {
    setMessages([]);
    resetNodes();
    setReportContent('');
    setReportCitations([]);
    setShowReport(false);
    const newId = Math.random().toString(36).slice(2);
    setConversations(prev => [{ id: newId, title: '新对话', updatedAt: Date.now() }, ...prev]);
    setActiveConversationId(newId);
  }, [resetNodes]);

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-[#0a0e1a] text-slate-200 font-sans">
      <Sidebar
        conversations={conversations}
        activeId={activeConversationId}
        onSelect={setActiveConversationId}
        onNewChat={handleNewChat}
      />

      <main className="flex-1 flex flex-col min-w-0">
        <TopBar
          onExportReport={() => setShowReport(true)}
          hasReport={!!reportContent}
          apiStatus={apiStatus}
        />

        <MessageList
          messages={messages}
          isLoading={isLoading}
          onViewReport={() => setShowReport(true)}
          hasReport={!!reportContent}
        />

        <div ref={messagesEndRef} />

        <ChatInput
          onSend={handleSend}
          onStop={handleStop}
          isLoading={isLoading}
        />
      </main>

      <WorkflowPanel
        nodes={nodes}
        plan={plan}
        currentAgent={currentAgent}
        kbState={kbState}
        retryInfo={retryInfo}
      />

      {showReport && reportContent && (
        <ReportViewer
          content={reportContent}
          citations={reportCitations}
          onClose={() => setShowReport(false)}
        />
      )}
    </div>
  );
}
