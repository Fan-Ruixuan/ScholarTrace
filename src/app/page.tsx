'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import Sidebar from '@/components/Sidebar';
import TopBar from '@/components/TopBar';
import MessageList from '@/components/MessageList';
import ChatInput from '@/components/ChatInput';
import WorkflowPanel from '@/components/WorkflowPanel';
import { orchestratorChat, type OrchestratorEvent } from '@/lib/coze-api';
import type { Message, AgentState, AgentType, Plan, AgentLog, Citation, TimelineEvent } from '@/lib/types';
import { AGENT_CONFIGS } from '@/lib/agent-config';

const INITIAL_AGENTS: Record<AgentType, AgentState> = {
  orchestrator: { status: 'idle', message: '', progress: 0, logs: [] },
  parse: { status: 'idle', message: '', progress: 0, logs: [] },
  data: { status: 'idle', message: '', progress: 0, logs: [] },
  report: { status: 'idle', message: '', progress: 0, logs: [] },
  check: { status: 'idle', message: '', progress: 0, logs: [] },
};

const INITIAL_KB = { l1: 0, l2: 0, l3: 0 };

export default function Home() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingContent, setStreamingContent] = useState('');
  const [streamingThinking, setStreamingThinking] = useState('');
  const [agents, setAgents] = useState<Record<AgentType, AgentState>>(INITIAL_AGENTS);
  const [plan, setPlan] = useState<Plan | null>(null);
  const [logs, setLogs] = useState<AgentLog[]>([]);
  const [kbHits, setKbHits] = useState(INITIAL_KB);
  const [activeCitation, setActiveCitation] = useState<string | null>(null);
  const [citationMap, setCitationMap] = useState<Map<string, Citation>>(new Map());
  const [apiConfigured, setApiConfigured] = useState(true);
  const [sessions, setSessions] = useState([
    { id: 'default', title: '新建任务', active: true },
  ]);
  const [currentSession, setCurrentSession] = useState('default');
  const [reportContent, setReportContent] = useState('');
  const [timelineEvents, setTimelineEvents] = useState<TimelineEvent[]>([]); // 时间轴回放数据源

  const abortRef = useRef<AbortController | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const currentMsgIdRef = useRef<string>('');
  const msgCitationCounterRef = useRef(0);
  const streamContentRef = useRef('');

  useEffect(() => {
    // 检查API配置
    fetch('/api/chat')
      .then(r => r.json())
      .then(data => setApiConfigured(!!data.apiConfigured))
      .catch(() => {});
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, streamingContent]);

  const resetAgents = () => {
    setAgents(INITIAL_AGENTS);
    setPlan(null);
    setLogs([]);
    setKbHits(INITIAL_KB);
    setStreamingContent('');
    setStreamingThinking('');
    setReportContent('');
    setTimelineEvents([]); // 同时清空时间轴
    msgCitationCounterRef.current = 0;
    streamContentRef.current = '';
  };

  const updateAgent = useCallback((agent: AgentType, patch: Partial<AgentState>) => {
    setAgents(prev => ({ ...prev, [agent]: { ...prev[agent], ...patch } }));
  }, []);

  const addLog = useCallback((agent: AgentType, log: string) => {
    setLogs(prev => [...prev, { agent, log, time: new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' }) }]);
    updateAgent(agent, { message: log });
  }, [updateAgent]);

  const handleSend = async (text: string, files: { id: string; name: string; type: string }[]) => {
    if (isStreaming) return;

    resetAgents();
    setActiveCitation(null);

    // 用户消息
    const userMsg: Message = {
      id: `u-${Date.now()}`,
      role: 'user',
      content: text + (files.length > 0 ? `\n\n*已上传 ${files.length} 个文件*` : ''),
      timestamp: new Date().toISOString(),
    };
    setMessages(prev => [...prev, userMsg]);

    // 准备AI消息
    const aiMsgId = `a-${Date.now()}`;
    currentMsgIdRef.current = aiMsgId;
    const aiMsg: Message = {
      id: aiMsgId,
      role: 'agent',
      content: '',
      agent: 'orchestrator',
      timestamp: new Date().toISOString(),
    };
    setMessages(prev => [...prev, aiMsg]);
    setIsStreaming(true);
    streamContentRef.current = '';
    setStreamingContent('');
    setStreamingThinking('正在连接...');

    const appendContent = (text: string) => {
      streamContentRef.current += text;
      setStreamingContent(streamContentRef.current);
    };

    const abortController = new AbortController();
    abortRef.current = abortController;

    try {
      const fileIds = files.map(f => f.id);
      await orchestratorChat(
        text,
        fileIds,
        (event: OrchestratorEvent) => {
          switch (event.type) {
            case 'plan':
              setPlan(event.plan);
              addLog('orchestrator', event.plan.description);
              event.plan.tasks.forEach(t => {
                updateAgent(t.agent, { status: 'pending', progress: 0, message: '等待执行' });
              });
              break;
            case 'agent.status':
              updateAgent(event.agent, {
                status: event.status as AgentState['status'],
                message: event.message || '',
                progress: event.status === 'running' ? 0.2 : event.status === 'done' ? 1 : event.status === 'error' ? 1 : 0,
              });
              break;
            case 'agent.progress':
              updateAgent(event.agent, { progress: event.progress / 100 });
              break;
            case 'agent.log':
              addLog(event.agent, event.log);
              break;
            case 'agent.output':
              // 工作流完成产出
              appendContent('\n' + event.output + '\n');
              break;
            case 'thinking':
              setStreamingThinking(event.content);
              break;
            case 'message.delta':
              setStreamingThinking('');
              appendContent(event.content);
              break;
            case 'citation.added':
              setCitationMap(prev => {
                const next = new Map(prev);
                next.set(event.citation.id, {
                  id: event.citation.id,
                  index: next.size + 1,
                  docId: event.citation.docId,
                  page: event.citation.page,
                  snippet: event.citation.claim,
                });
                return next;
              });
              break;
            case 'report.ready':
              setReportContent(event.report);
              break;
            case 'knowledge.access': {
              const layerKey = event.layer.toLowerCase() as 'l1' | 'l2' | 'l3';
              setKbHits(prev => ({
                l1: prev.l1 + (layerKey === 'l1' ? 1 : 0),
                l2: prev.l2 + (layerKey === 'l2' ? 1 : 0),
                l3: prev.l3 + (layerKey === 'l3' ? 1 : 0),
              }));
              addLog('orchestrator', `${event.action === 'read' ? '读取' : '写入'}${event.layer}：${event.detail}`);
              break;
            }
            case 'retry.loop':
              addLog('check', `打回${event.toAgent}重试，原因：${event.reason.slice(0, 50)}`);
              break;
            case 'error':
              addLog(event.agent || 'orchestrator', event.msg);
              if (event.agent) {
                updateAgent(event.agent, { status: 'error', message: event.msg });
              }
              break;
            case 'done':
              setAgents(prev => {
                const next = { ...prev };
                (Object.keys(next) as AgentType[]).forEach(k => {
                  if (next[k].status === 'running' || next[k].status === 'pending' || next[k].status === 'retry') {
                    next[k] = { ...next[k], status: 'done', progress: 1 };
                  }
                });
                return next;
              });
              break;
            case 'timeline':
              setTimelineEvents(prev => [...prev, event.timeline]);
              break;
          }
        },
        abortController.signal
      );

      // 最终写入消息内容（使用累积的完整内容，避免闭包旧值导致内容丢失）
      const finalContent = streamContentRef.current;
      setMessages(prev => prev.map(m => m.id === aiMsgId ? { ...m, content: finalContent } : m));
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        console.error('Chat error:', err);
      }
    } finally {
      setIsStreaming(false);
      setStreamingContent('');
      setStreamingThinking('');
      abortRef.current = null;
    }
  };

  const handleStop = () => {
    abortRef.current?.abort();
  };

  const handleNewSession = () => {
    if (isStreaming) return;
    resetAgents();
    setMessages([]);
    setCitationMap(new Map());
    setActiveCitation(null);
    setReportContent('');
    const id = `s-${Date.now()}`;
    setSessions([{ id, title: '新建任务', active: true }, ...sessions.map(s => ({ ...s, active: false }))]);
    setCurrentSession(id);
  };

  const handleExport = () => {
    const content = reportContent || streamingContent;
    if (!content) {
      alert('暂无报告内容可导出');
      return;
    }
    const blob = new Blob([content], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `溯研报告_${new Date().toISOString().slice(0, 10)}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <TopBar
        apiConfigured={apiConfigured}
        onExport={handleExport}
        sessionTitle={sessions.find(s => s.id === currentSession)?.title}
      />
      <div className="app-layout">
        <Sidebar
          sessions={sessions}
          currentSession={currentSession}
          onNewSession={handleNewSession}
          onSelectSession={(id) => {
            setCurrentSession(id);
            setSessions(prev => prev.map(s => ({ ...s, active: s.id === id })));
          }}
          kbCounts={kbHits}
        />
        <div className="main-area">
          <MessageList
            messages={messages}
            isStreaming={isStreaming}
            streamingContent={streamingContent}
            onCitationClick={setActiveCitation}
            activeCitation={activeCitation}
            citationMap={citationMap}
          />
          <div ref={messagesEndRef} />
          <ChatInput
            onSend={handleSend}
            onStop={handleStop}
            isStreaming={isStreaming}
          />
        </div>
        <WorkflowPanel
          plan={plan}
          agents={agents}
          logs={logs}
          kbHits={kbHits}
          activeCitation={activeCitation}
          timelineEvents={timelineEvents}
        />
      </div>
    </div>
  );
}
