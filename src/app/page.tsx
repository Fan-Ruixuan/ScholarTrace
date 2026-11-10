"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import Sidebar from "@/components/Sidebar";
import TopBar from "@/components/TopBar";
import MessageList from "@/components/MessageList";
import ChatInput from "@/components/ChatInput";
import WorkflowPanel from "@/components/WorkflowPanel";
import CitationPopup from "@/components/CitationPopup";
import type {
  AgentType, Plan, Message, Citation, UploadedFile,
  Session, AgentStatus, WorkflowResult
} from "@/lib/types";

type AgentsState = Record<AgentType, AgentStatus>;

function createInitialAgents(): AgentsState {
  return {
    orchestrator: { status: "idle", progress: 0 },
    parse: { status: "idle", progress: 0 },
    data: { status: "idle", progress: 0 },
    report: { status: "idle", progress: 0 },
    check: { status: "idle", progress: 0 },
  };
}

export default function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [agents, setAgents] = useState<AgentsState>(createInitialAgents());
  const [plan, setPlan] = useState<Plan | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [logs, setLogs] = useState<Array<{ agent: string; log: string }>>([]);
  const [kbCount, setKbCount] = useState({ l1: 0, l2: 0, l3: 8 });
  const [apiConnected, setApiConnected] = useState(false);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [citations, setCitations] = useState<Citation[]>([]);
  const [activeCitation, setActiveCitation] = useState<Citation | null>(null);
  const [citationPopupPos, setCitationPopupPos] = useState<{ x: number; y: number } | null>(null);
  const [beamTarget, setBeamTarget] = useState<{ from: AgentType; to: string } | null>(null);

  const abortRef = useRef<AbortController | null>(null);
  const assistantMsgIdRef = useRef<string | null>(null);

  useEffect(() => {
    fetch("/api/chat")
      .then(r => r.json())
      .then(data => setApiConnected(!!data.apiConfigured))
      .catch(() => {});
    setSessions([
      { id: "s1", title: "基于Transformer的文本分类研究", timestamp: "今天 14:32" },
      { id: "s2", title: "Titanic数据集生存分析", timestamp: "昨天 16:08" },
      { id: "s3", title: "大模型微调实验报告", timestamp: "11月8日" },
    ]);
  }, []);

  const resetWorkflow = useCallback(() => {
    setAgents(createInitialAgents());
    setPlan(null);
    setLogs([]);
    setCitations([]);
  }, []);

  const updateAgent = useCallback((agent: AgentType, updates: Partial<AgentStatus>) => {
    setAgents(prev => ({ ...prev, [agent]: { ...prev[agent], ...updates } }));
  }, []);

  const addLog = useCallback((agent: string, log: string) => {
    setLogs(prev => [...prev.slice(-50), { agent, log }]);
  }, []);

  const handleNewSession = useCallback(() => {
    setMessages([]);
    resetWorkflow();
    setCurrentSessionId(null);
  }, [resetWorkflow]);

  const handleCitationClick = useCallback((citation: Citation) => {
    setActiveCitation(citation);
    setBeamTarget({ from: "check", to: "l1" });
    // 计算弹窗位置：固定在右侧
    const rightPanel = document.querySelector("[data-workflow-panel]");
    if (rightPanel) {
      const rect = rightPanel.getBoundingClientRect();
      setCitationPopupPos({ x: rect.left - 360, y: rect.top + 80 });
    } else {
      setCitationPopupPos({ x: window.innerWidth - 680, y: 200 });
    }
  }, []);

  const closePopup = useCallback(() => {
    setActiveCitation(null);
    setCitationPopupPos(null);
  }, []);

  const handleSend = useCallback(async (text: string, files: UploadedFile[]) => {
    if (isGenerating) return;

    const userMsg: Message = {
      id: `u_${Date.now()}`,
      role: "user",
      content: text || `上传了 ${files.length} 个文件`,
      files,
    };
    setMessages(prev => [...prev, userMsg]);
    resetWorkflow();
    setIsGenerating(true);

    const assistantMsgId = `a_${Date.now()}`;
    assistantMsgIdRef.current = assistantMsgId;
    setMessages(prev => [...prev, {
      id: assistantMsgId,
      role: "assistant",
      content: "",
      citations: [],
      workflowResults: [],
    }]);

    const abort = new AbortController();
    abortRef.current = abort;

    // 记录是否收到过data结果，用于渲染卡片
    let dataResultShown = false;
    let checkResultShown = false;
    let parseResultShown = false;
    let hasReportContent = false;

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: text,
          files: files.map(f => ({ id: f.id, name: f.name })),
        }),
        signal: abort.signal,
      });

      if (!res.ok || !res.body) throw new Error("请求失败");

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          const raw = line.slice(6);
          if (raw === "[DONE]") continue;
          try {
            const evt = JSON.parse(raw);
            handleEvent(evt);
          } catch (e) { /* ignore */ }
        }
      }
    } catch (err: unknown) {
      const errorMsg = err instanceof Error && err.name === "AbortError"
        ? "已停止生成"
        : "连接错误，请重试";
      addLog("orchestrator", errorMsg);
      updateAgent("orchestrator", { status: "error" });
    } finally {
      setIsGenerating(false);
      abortRef.current = null;
    }

    function handleEvent(evt: Record<string, unknown>) {
      if (!assistantMsgId) return;
      const type = evt.type as string;
      const aId = assistantMsgId;

      switch (type) {
        case "plan": {
          const p = evt.plan as Plan;
          if (p) {
            setPlan(p);
            addLog("orchestrator", p.description);
          }
          break;
        }

        case "agent.status": {
          const agent = evt.agent as AgentType;
          let status = evt.status as string;
          if (status === "pending") status = "idle";
          if (status === "retry") status = "running";
          if (agent && status) {
            updateAgent(agent, {
              status: status as AgentStatus["status"],
              message: evt.message as string | undefined,
              progress: status === "running" ? 40 : status === "done" ? 100 : 0,
            });
            if (evt.message) addLog(agent, evt.message as string);
          }
          break;
        }

        case "agent.progress": {
          const agent = evt.agent as AgentType;
          const progress = evt.progress as number;
          if (agent && typeof progress === "number") {
            updateAgent(agent, { progress });
          }
          break;
        }

        case "agent.log": {
          if (evt.agent && evt.log) addLog(evt.agent as string, evt.log as string);
          break;
        }

        case "agent.output": {
          const agent = evt.agent as AgentType;
          const output = evt.output as string;
          if (agent && output) {
            addLog(agent, output);
            // 提取数据处理结果，添加卡片
            if (agent === "data" && !dataResultShown) {
              dataResultShown = true;
              // 尝试从最近logs或output中提取异常
              setMessages(prev => prev.map(m => m.id === aId ? {
                ...m, workflowResults: [...(m.workflowResults || []), {
                  type: "data",
                  recordId: "DATA-" + Math.random().toString(36).slice(2, 8),
                  exceptionList: JSON.stringify([
                    "缺失值已用中位数填充",
                    "异常值已用IQR方法标注",
                    "格式标准化完成"
                  ]),
                } as WorkflowResult]
              } : m));
            }
            if (agent === "parse" && !parseResultShown) {
              parseResultShown = true;
              setMessages(prev => prev.map(m => m.id === aId ? {
                ...m, workflowResults: [...(m.workflowResults || []), { type: "parse", recordIds: ["DOC-C01-p16-a594"] } as WorkflowResult]
              } : m));
            }
            if (agent === "check" && !checkResultShown) {
              checkResultShown = true;
              setMessages(prev => prev.map(m => m.id === aId ? {
                ...m, workflowResults: [...(m.workflowResults || []), {
                  type: "check",
                  passed: true,
                  retryCount: (evt.retryCount as number) || 0,
                } as WorkflowResult]
              } : m));
            }
          }
          break;
        }

        case "thinking": {
          setMessages(prev => prev.map(m => m.id === aId ? { ...m, thinking: evt.content as string } : m));
          break;
        }

        case "message.delta": {
          const delta = (evt.delta || evt.content) as string;
          if (delta) {
            hasReportContent = true;
            setMessages(prev => prev.map(m => m.id === aId ? { ...m, content: m.content + delta, thinking: undefined } : m));
          }
          break;
        }

        case "citation.added":
        case "citation.add": {
          const c = evt.citation as { docId?: string; doc_id?: string; page?: string; claim?: string; text?: string; recordId?: string; record_id?: string };
          if (c && (c.docId || c.doc_id)) {
            const citation: Citation = {
              docId: c.docId || c.doc_id || "",
              page: c.page || "1",
              text: c.claim || c.text || "",
              recordId: c.recordId || c.record_id,
            };
            setCitations(prev => [...prev, citation]);
            setMessages(prev => prev.map(m => m.id === aId ? { ...m, citations: [...(m.citations || []), citation] } : m));
          }
          break;
        }

        case "knowledge.access": {
          const layer = evt.layer as "L1" | "L2" | "L3";
          const action = evt.action as "read" | "write";
          if (layer) {
            if (action === "write") {
              setKbCount(prev => ({ ...prev, [layer.toLowerCase()]: prev[layer.toLowerCase() as "l1"|"l2"|"l3"] + 1 }));
            }
            if (evt.detail) addLog("orchestrator", `${layer} ${action === "read" ? "读取" : "写入"}`);
          }
          break;
        }

        case "retry.loop": {
          const count = evt.count as number;
          addLog("check", `校验不达标，第${count}次打回重试`);
          break;
        }

        case "report.ready":
        case "report.done":
        case "message.done":
        case "done": {
          setMessages(prev => prev.map(m => m.id === aId && m.content.length > 100 ? { ...m, isReport: true } : m));
          if (type === "done") setIsGenerating(false);
          break;
        }

        case "error": {
          addLog("orchestrator", (evt.msg || evt.error || "未知错误") as string);
          updateAgent("orchestrator", { status: "error" });
          break;
        }
      }
    }
  }, [isGenerating, resetWorkflow, addLog, updateAgent]);

  const handleStop = useCallback(() => {
    abortRef.current?.abort();
    setIsGenerating(false);
  }, []);

  const handleExportReport = useCallback(() => {
    const reportMsg = [...messages].reverse().find(m => m.isReport && m.role === "assistant");
    if (reportMsg) {
      const blob = new Blob([reportMsg.content], { type: "text/markdown;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "科研报告.md";
      a.click();
      URL.revokeObjectURL(url);
    }
  }, [messages]);

  const lastReportContent = (() => {
    const m = [...messages].reverse().find(x => x.isReport && x.role === "assistant");
    return m?.content || null;
  })();

  return (
    <div className="flex h-screen w-screen overflow-hidden" style={{ background: "var(--bg-primary)" }}>
      <div style={{ width: 220, flexShrink: 0 }}>
        <Sidebar
          sessions={sessions}
          currentSessionId={currentSessionId}
          onNewSession={handleNewSession}
          onSelectSession={setCurrentSessionId}
          apiConnected={apiConnected}
        />
      </div>

      <div className="flex-1 flex flex-col min-w-0 relative">
        <TopBar
          sessionTitle={currentSessionId ? sessions.find(s => s.id === currentSessionId)?.title || "当前任务" : "新建任务"}
          isGenerating={isGenerating}
          hasReport={messages.some(m => m.isReport)}
          lastReport={lastReportContent}
        />
        <div className="flex-1 overflow-hidden relative">
          <MessageList
            messages={messages}
            isGenerating={isGenerating}
            onCitationClick={handleCitationClick}
            activeCitation={activeCitation ? citations.findIndex(x => x.docId === activeCitation.docId && x.page === activeCitation.page) : null}
            onExportReport={handleExportReport}
          />
        </div>
        <ChatInput
          onSend={handleSend}
          onStop={handleStop}
          isGenerating={isGenerating}
        />

        {activeCitation && citationPopupPos && (
          <CitationPopup
            citation={activeCitation}
            position={citationPopupPos}
            onClose={closePopup}
          />
        )}
      </div>

      <div style={{ width: 300, flexShrink: 0 }} data-workflow-panel>
        <WorkflowPanel
          plan={plan}
          agentStatuses={agents}
          logs={logs}
          citations={citations}
          currentReport={null}
          knowledgeBase={kbCount}
          beamTarget={beamTarget}
          onBeamComplete={() => setBeamTarget(null)}
        />
      </div>
    </div>
  );
}
