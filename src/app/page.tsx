'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { Sidebar } from '@/components/Sidebar';
import { TopBar, ReportViewer } from '@/components/TopBar';
import { MessageList, type Message } from '@/components/MessageList';
import { ChatInput, type UploadedFile } from '@/components/ChatInput';
import { WorkflowPanel } from '@/components/WorkflowPanel';
import type { AgentType, Plan, KnowledgeBase } from '@/lib/types';

type AgentState = {
  status: 'pending' | 'running' | 'done' | 'error';
  progress: number;
  logs: string[];
  output?: Record<string, unknown>;
};

type AgentsState = Record<AgentType, AgentState>;

function createInitialAgents(): AgentsState {
  return {
    orchestrator: { status: 'pending', progress: 0, logs: [] },
    parse: { status: 'pending', progress: 0, logs: [] },
    data: { status: 'pending', progress: 0, logs: [] },
    report: { status: 'pending', progress: 0, logs: [] },
    check: { status: 'pending', progress: 0, logs: [] },
  };
}

const initialKnowledgeBases: KnowledgeBase[] = [
  { level: 'L1', name: '原始文献库', desc: 'PDF原文/原始数据', count: 0 },
  { level: 'L2', name: '结构化知识库', desc: '解析后的摘要/参数', count: 0 },
  { level: 'L3', name: '规则校验库', desc: '学术规范/模板', count: 0 },
];

export default function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [agents, setAgents] = useState<AgentsState>(createInitialAgents());
  const [plan, setPlan] = useState<Plan | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [showReport, setShowReport] = useState(false);
  const [reportContent, setReportContent] = useState('');
  const [knowledgeBases, setKnowledgeBases] = useState<KnowledgeBase[]>(initialKnowledgeBases);
  const [apiConnected, setApiConnected] = useState(false);
  const [sessions, setSessions] = useState<Array<{ id: string; title: string; time: string }>>([]);
  const [activeNav, setActiveNav] = useState('chat');

  const abortRef = useRef<AbortController | null>(null);
  const assistantMsgIdRef = useRef<string | null>(null);

  useEffect(() => {
    fetch('/api/chat')
      .then((r) => r.json())
      .then((data) => {
        setApiConnected(!!data.apiConfigured);
      })
      .catch(() => {});
  }, []);

  const resetWorkflow = useCallback(() => {
    setAgents(createInitialAgents());
    setPlan(null);
    setKnowledgeBases([
      { level: 'L1', name: '原始文献库', desc: 'PDF原文/原始数据', count: 0 },
      { level: 'L2', name: '结构化知识库', desc: '解析后的摘要/参数', count: 0 },
      { level: 'L3', name: '规则校验库', desc: '学术规范/模板', count: 0 },
    ]);
  }, []);

  const updateAgent = useCallback(
    (agent: AgentType, updates: Partial<AgentState>) => {
      setAgents((prev) => ({
        ...prev,
        [agent]: { ...prev[agent], ...updates },
      }));
    },
    []
  );

  const handleNewChat = useCallback(() => {
    setMessages([]);
    setReportContent('');
    resetWorkflow();
  }, [resetWorkflow]);

  const handleSend = useCallback(
    async (text: string, files: UploadedFile[]) => {
      if (isGenerating) return;

      // 添加用户消息
      const userMsg: Message = {
        id: `u_${Date.now()}`,
        role: 'user',
        content: text || `上传了 ${files.length} 个文件`,
      };
      setMessages((prev) => [...prev, userMsg]);

      // 重置工作流
      resetWorkflow();
      setIsGenerating(true);
      setReportContent('');

      // 添加AI占位消息
      const assistantId = `a_${Date.now()}`;
      assistantMsgIdRef.current = assistantId;
      setMessages((prev) => [
        ...prev,
        { id: assistantId, role: 'assistant', content: '', streaming: true },
      ]);

      // 更新L1计数
      if (files.length > 0) {
        setKnowledgeBases((prev) =>
          prev.map((kb) =>
            kb.level === 'L1' ? { ...kb, count: kb.count + files.length } : kb
          )
        );
      }

      const abortController = new AbortController();
      abortRef.current = abortController;

      try {
        const res = await fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            message: text,
            files: files.map((f) => ({ id: f.id, name: f.name })),
          }),
          signal: abortController.signal,
        });

        if (!res.ok || !res.body) throw new Error('请求失败');

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';
        let content = '';
        let msgCitations: Message['citations'] = [];
        let msgExceptions: string[] = [];
        let msgCheckResult: Message['checkResult'];

        const flushMessage = () => {
          setMessages((prev) =>
            prev.map((m) =>
              m.id === assistantId
                ? {
                    ...m,
                    content,
                    citations: msgCitations,
                    exceptions: msgExceptions,
                    checkResult: msgCheckResult,
                  }
                : m
            )
          );
        };

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';

          for (const line of lines) {
            if (!line.startsWith('data: ')) continue;
            const jsonStr = line.slice(6).trim();
            if (!jsonStr || jsonStr === '[DONE]') continue;

            try {
              const event = JSON.parse(jsonStr);

              switch (event.type) {
                case 'plan': {
                  const p = event.plan;
                  setPlan({
                    intent: p.intent,
                    description: p.description,
                    tasks: p.tasks.map((t: { agent: AgentType; description: string; dependsOn: AgentType[] }) => ({
                      agent: t.agent,
                      description: t.description,
                      dependsOn: t.dependsOn || [],
                    })),
                  });
                  updateAgent('orchestrator', { status: 'running', progress: 60, logs: ['生成执行计划...'] });
                  break;
                }

                case 'agent.status': {
                  updateAgent(event.agent, {
                    status: event.status,
                    progress: event.status === 'running' ? 30 : event.status === 'done' ? 100 : 0,
                    logs: event.message
                      ? [...(agents[event.agent as AgentType]?.logs || []), event.message]
                      : agents[event.agent as AgentType]?.logs || [],
                  });

                  // 更新知识库访问
                  if (event.agent === 'parse' && event.status === 'running') {
                    setKnowledgeBases((prev) =>
                      prev.map((kb) =>
                        kb.level === 'L2' ? { ...kb, count: Math.max(kb.count, 1) } : kb
                      )
                    );
                  }
                  if (event.agent === 'data' && event.status === 'done') {
                    setKnowledgeBases((prev) =>
                      prev.map((kb) =>
                        kb.level === 'L2' ? { ...kb, count: kb.count + 1 } : kb
                      )
                    );
                  }
                  if (event.agent === 'check' && event.status === 'running') {
                    setKnowledgeBases((prev) =>
                      prev.map((kb) => (kb.level === 'L3' ? { ...kb, count: 1 } : kb))
                    );
                  }
                  break;
                }

                case 'agent.log': {
                  updateAgent(event.agent, {
                    logs: [...(agents[event.agent as AgentType]?.logs || []), event.log],
                    progress: Math.min(
                      (agents[event.agent as AgentType]?.progress || 0) + 10,
                      90
                    ),
                  });
                  break;
                }

                case 'agent.output': {
                  const out = event.output || {};
                  updateAgent(event.agent, { status: 'done', progress: 100, output: out });

                  // 处理数据异常
                  if (event.agent === 'data' && out.exception_list) {
                    try {
                      const list = JSON.parse(out.exception_list as string);
                      msgExceptions = Array.isArray(list) ? list : [];
                    } catch {}
                  }

                  // 处理校验结果
                  if (event.agent === 'check') {
                    const passed = out.passed === 'true' || out.passed === true;
                    const issues = out.validation_result ? [String(out.validation_result)] : [];
                    msgCheckResult = {
                      passed,
                      issues: passed ? [] : issues,
                      retryCount: out.retry_count ? Number(out.retry_count) : undefined,
                    };
                  }

                  // 报告内容
                  if (event.agent === 'report' && out.report_content) {
                    content = out.report_content as string;
                    setReportContent(out.report_content as string);
                  }
                  flushMessage();
                  break;
                }

                case 'message.delta': {
                  content += event.content;
                  flushMessage();
                  break;
                }

                case 'message': {
                  content = event.content;
                  flushMessage();
                  break;
                }

                case 'citation.add': {
                  msgCitations = [
                    ...msgCitations,
                    {
                      id: `c_${Date.now()}`,
                      docId: event.docId,
                      page: event.page,
                    },
                  ];
                  flushMessage();
                  break;
                }

                case 'done': {
                  updateAgent('check', { status: 'done', progress: 100 });
                  updateAgent('orchestrator', { status: 'done', progress: 100 });
                  break;
                }
              }
            } catch (e) {
              // skip parse error
            }
          }
        }

        // 完成
        setMessages((prev) =>
          prev.map((m) => (m.id === assistantId ? { ...m, streaming: false } : m))
        );
      } catch (err: unknown) {
        if ((err as Error).name !== 'AbortError') {
          setMessages((prev) =>
            prev.map((m) =>
              m.id === assistantId
                ? { ...m, content: '抱歉，处理请求时出错，请稍后重试。', streaming: false }
                : m
            )
          );
        }
      } finally {
        setIsGenerating(false);
        abortRef.current = null;
        assistantMsgIdRef.current = null;
      }
    },
    [isGenerating, resetWorkflow, updateAgent, agents]
  );

  const handleStop = useCallback(() => {
    abortRef.current?.abort();
    setIsGenerating(false);
    setMessages((prev) =>
      prev.map((m) => (m.streaming ? { ...m, streaming: false } : m))
    );
  }, []);

  // 监听快捷按钮点击
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const chip = target.closest('[data-quick]') as HTMLElement | null;
      if (chip) {
        const text = chip.getAttribute('data-quick');
        if (text) {
          const textarea = document.getElementById('chat-textarea') as HTMLTextAreaElement;
          if (textarea) {
            // 找到React的setState通过事件触发
            const nativeSetter = Object.getOwnPropertyDescriptor(
              window.HTMLTextAreaElement.prototype,
              'value'
            )?.set;
            nativeSetter?.call(textarea, text);
            textarea.dispatchEvent(new Event('input', { bubbles: true }));
            textarea.focus();
          }
        }
      }
    };
    document.addEventListener('click', handler);
    return () => document.removeEventListener('click', handler);
  }, []);

  const hasReport = reportContent.length > 0;
  const pageTitle = messages.length === 0 ? '溯研 · 多智能体科研协作平台' : '科研任务进行中';

  return (
    <div className="flex h-screen overflow-hidden bg-white">
      <Sidebar
        sessions={sessions}
        activeSessionId={null}
        activeNav={activeNav}
        onNewChat={handleNewChat}
        onSelectSession={() => {}}
        onSelectNav={setActiveNav}
      />

      <main className="main-area">
        <TopBar
          title={pageTitle}
          isConnected={apiConnected}
          hasReport={hasReport}
          onExport={() => setShowReport(true)}
          onCopyReport={() => {
            if (reportContent) navigator.clipboard.writeText(reportContent);
          }}
        />
        <MessageList messages={messages} isGenerating={isGenerating} />
        <ChatInput onSend={handleSend} onStop={handleStop} isGenerating={isGenerating} />
      </main>

      <WorkflowPanel plan={plan} agents={agents} knowledgeBases={knowledgeBases} />

      {showReport && reportContent && (
        <ReportViewer content={reportContent} onClose={() => setShowReport(false)} />
      )}
    </div>
  );
}
