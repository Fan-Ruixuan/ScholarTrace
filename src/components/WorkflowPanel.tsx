"use client";

import { AGENTS, AGENT_COLORS, type AgentType, type AgentStatus } from "@/lib/agent-config";
import { useEffect, useRef, useState } from "react";

interface WorkflowPanelProps {
  plan: {
    intent: string;
    description: string;
    tasks: Array<{
      agent: AgentType;
      dependsOn: AgentType[];
      parallel?: boolean;
      description: string;
    }>;
  } | null;
  agentStatuses: Record<string, AgentStatus>;
  logs: Array<{ agent: string; log: string }>;
  citations: Array<{ docId: string; page: string; text?: string; recordId?: string }>;
  currentReport: string | null;
  knowledgeBase: { l1: number; l2: number; l3: number };
  beamTarget: { from: AgentType; to: string } | null;
  onBeamComplete: () => void;
}

// 拓扑节点坐标（SVG viewBox 280 x 520）
const NODE_POS: Record<string, { x: number; y: number; label: string; color: string; type: "agent" | "kb" }> = {
  orchestrator: { x: 140, y: 50, label: "主控调度", color: AGENT_COLORS.orchestrator, type: "agent" },
  parse:        { x: 80,  y: 145, label: "文献解析", color: AGENT_COLORS.parse, type: "agent" },
  data:         { x: 200, y: 145, label: "数据处理", color: AGENT_COLORS.data, type: "agent" },
  report:       { x: 140, y: 255, label: "报告生成", color: AGENT_COLORS.report, type: "agent" },
  check:        { x: 140, y: 355, label: "合规校验", color: AGENT_COLORS.check, type: "agent" },
  l1: { x: 60,  y: 455, label: "L1 原始库", color: "#845ef7", type: "kb" },
  l2: { x: 140, y: 455, label: "L2 结构化", color: "#339af0", type: "kb" },
  l3: { x: 220, y: 455, label: "L3 规则库", color: "#f06595", type: "kb" },
};

// 连线定义（from -> to, direction）
const EDGES: Array<{ from: string; to: string; direction?: "up" | "down" }> = [
  { from: "orchestrator", to: "parse" },
  { from: "orchestrator", to: "data" },
  { from: "parse", to: "report" },
  { from: "data", to: "report" },
  { from: "report", to: "check" },
  { from: "l1", to: "parse", direction: "up" },
  { from: "parse", to: "l2" },
  { from: "data", to: "l2" },
  { from: "l2", to: "report", direction: "up" },
  { from: "l3", to: "check", direction: "up" },
  { from: "check", to: "l1", direction: "up" },
];

export default function WorkflowPanel({
  plan, agentStatuses, logs, citations, knowledgeBase, beamTarget, onBeamComplete
}: WorkflowPanelProps) {
  const [showBeam, setShowBeam] = useState(false);
  const [beamPath, setBeamPath] = useState("");
  const [beamColor, setBeamColor] = useState("");
  const logsEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [logs.length]);

  // 溯源光束
  useEffect(() => {
    if (beamTarget) {
      const from = NODE_POS[beamTarget.from];
      const to = NODE_POS[beamTarget.to] || NODE_POS.l1;
      if (from && to) {
        setBeamPath(`M ${from.x} ${from.y} L ${to.x} ${to.y}`);
        setBeamColor(from.color);
        setShowBeam(true);
        const t = setTimeout(() => {
          setShowBeam(false);
          onBeamComplete();
        }, 1200);
        return () => clearTimeout(t);
      }
    }
  }, [beamTarget, onBeamComplete]);

  // 当前激活的连线（Agent running时对应数据流入流出）
  const activeEdges: Set<string> = new Set();
  const activeAgents = Object.entries(agentStatuses)
    .filter(([, s]) => s.status === "running")
    .map(([a]) => a);

  activeAgents.forEach(a => {
    EDGES.forEach(e => {
      if (e.from === a || e.to === a) activeEdges.add(`${e.from}-${e.to}`);
    });
  });

  const getStatusDot = (status?: AgentStatus) => {
    if (!status || status.status === "idle") {
      return <circle r="4" fill="var(--text-tertiary)" opacity="0.5" />;
    }
    if (status.status === "running") {
      return (
        <g>
          <circle r="6" fill="none" stroke="currentColor" strokeWidth="2" opacity="0.3" className="animate-node-breath" />
          <circle r="4" fill="currentColor" />
        </g>
      );
    }
    if (status.status === "done") {
      return <circle r="4" fill="var(--success)" />;
    }
    if (status.status === "error") {
      return <circle r="4" fill="var(--error)" />;
    }
    return <circle r="4" fill="var(--warning)" />;
  };

  const lastLog = logs[logs.length - 1];
  const runningAgent = activeAgents[activeAgents.length - 1];

  return (
    <div
      className="flex flex-col h-full"
      style={{ background: "var(--bg-surface)", borderLeft: "1px solid var(--border-subtle)" }}
    >
      {/* 标题 */}
      <div className="px-4 py-3" style={{ borderBottom: "1px solid var(--border-subtle)" }}>
        <div className="flex items-center justify-between">
          <span style={{ fontSize: "13px", fontWeight: 600, color: "var(--text-primary)" }}>
            知识拓扑
          </span>
          {runningAgent && (
            <span className="flex items-center gap-1.5" style={{ fontSize: "11px", color: AGENT_COLORS[runningAgent as AgentType] }}>
              <span className="w-1.5 h-1.5 rounded-full animate-node-breath" style={{ background: "currentColor" }} />
              执行中
            </span>
          )}
        </div>
        {plan && (
          <div className="mt-2 text-xs" style={{ color: "var(--text-secondary)" }}>
            {plan.description}
          </div>
        )}
      </div>

      {/* SVG 拓扑图 */}
      <div className="px-2 py-2" style={{ borderBottom: "1px solid var(--border-subtle)" }}>
        <svg viewBox="0 0 280 500" className="w-full" style={{ height: 360 }}>
          {/* 连线 */}
          {EDGES.map(e => {
            const from = NODE_POS[e.from];
            const to = NODE_POS[e.to];
            if (!from || !to) return null;
            const key = `${e.from}-${e.to}`;
            const isActive = activeEdges.has(key);
            const midX = (from.x + to.x) / 2;
            const midY = (from.y + to.y) / 2;
            // 曲线控制点
            const d = `M ${from.x} ${from.y} Q ${midX} ${midY} ${to.x} ${to.y}`;
            return (
              <g key={key}>
                <path
                  d={d}
                  fill="none"
                  stroke={isActive ? from.color : "rgba(255,255,255,0.08)"}
                  strokeWidth={isActive ? 1.5 : 1}
                  opacity={isActive ? 0.6 : 1}
                />
                {isActive && (
                  <circle r="2.5" fill={from.color}>
                    <animateMotion dur="1.5s" repeatCount="indefinite" path={d} />
                  </circle>
                )}
              </g>
            );
          })}

          {/* 溯源光束 */}
          {showBeam && (
            <path
              d={beamPath}
              fill="none"
              stroke={beamColor}
              strokeWidth={2.5}
              strokeLinecap="round"
              className="animate-beam"
              style={{ filter: `drop-shadow(0 0 6px ${beamColor})` }}
            />
          )}

          {/* 节点 */}
          {Object.entries(NODE_POS).map(([key, node]) => {
            const status = agentStatuses[key];
            const isKb = node.type === "kb";
            const r = isKb ? 14 : 18;
            return (
              <g key={key} transform={`translate(${node.x}, ${node.y})`} style={{ color: node.color }}>
                {/* 光晕（running时） */}
                {status?.status === "running" && (
                  <circle r={r + 8} fill="none" stroke={node.color} strokeWidth="1" opacity="0.2" className="animate-node-breath" />
                )}
                {/* 节点圆 */}
                <circle
                  r={r}
                  fill={status?.status === "done" ? `${node.color}22` : (status?.status === "running" ? `${node.color}33` : "rgba(255,255,255,0.04)")}
                  stroke={node.color}
                  strokeWidth={status?.status === "running" || status?.status === "done" ? 2 : 1.5}
                  opacity={status?.status === "idle" ? 0.5 : 1}
                />
                {/* 知识库节点内文字（短） */}
                {isKb && (
                  <text
                    y="1"
                    textAnchor="middle"
                    dominantBaseline="middle"
                    fontSize="8"
                    fontWeight="600"
                    fill={node.color}
                    style={{ fontFamily: "JetBrains Mono, monospace" }}
                  >
                    {key.toUpperCase()}
                  </text>
                )}
                {/* Agent状态圆点 */}
                {!isKb && (
                  <g transform={`translate(0, 0)`}>
                    {!status || status.status === "idle" ? (
                      <circle r="3" fill="rgba(255,255,255,0.2)" />
                    ) : status.status === "running" ? (
                      <circle r="3" fill={node.color}>
                        <animate attributeName="opacity" values="0.4;1;0.4" dur="1.2s" repeatCount="indefinite" />
                      </circle>
                    ) : status.status === "done" ? (
                      <path d="M -2 0 L -0.5 1.5 L 2 -1.5" stroke="#fff" strokeWidth="1.2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                    ) : (
                      <text y="1" textAnchor="middle" dominantBaseline="middle" fontSize="7" fill="#fff" fontWeight="600">!</text>
                    )}
                  </g>
                )}
                {/* 标签 */}
                <text
                  y={r + 14}
                  textAnchor="middle"
                  fontSize="10"
                  fill={status?.status ? "var(--text-secondary)" : "var(--text-tertiary)"}
                  fontWeight={status?.status === "running" ? 500 : 400}
                >
                  {node.label}
                </text>
                {/* KB计数 */}
                {isKb && (
                  <text
                    y={r + 26}
                    textAnchor="middle"
                    fontSize="9"
                    fill={node.color}
                    fontFamily="JetBrains Mono, monospace"
                    opacity={0.8}
                  >
                    {key === "l1" ? knowledgeBase.l1 : key === "l2" ? knowledgeBase.l2 : knowledgeBase.l3}
                  </text>
                )}
                {/* Agent进度 */}
                {!isKb && status?.progress !== undefined && status.progress > 0 && status.progress < 100 && (
                  <text y={r + 26} textAnchor="middle" fontSize="9" fill={node.color} fontFamily="JetBrains Mono, monospace">
                    {status.progress}%
                  </text>
                )}
              </g>
            );
          })}
        </svg>
      </div>

      {/* 任务进度/引用计数 */}
      {citations.length > 0 && (
        <div className="px-4 py-2 flex items-center gap-4" style={{ borderBottom: "1px solid var(--border-subtle)" }}>
          <div className="text-xs" style={{ color: "var(--text-tertiary)" }}>
            引用 <span style={{ color: "var(--text-secondary)", fontFamily: "JetBrains Mono" }}>{citations.length}</span>
          </div>
          <div className="text-xs" style={{ color: "var(--text-tertiary)" }}>
            记录 <span style={{ color: "var(--text-secondary)", fontFamily: "JetBrains Mono" }}>{knowledgeBase.l2}</span>
          </div>
        </div>
      )}

      {/* 实时日志 */}
      <div className="flex-1 overflow-y-auto px-4 py-3">
        <div
          className="text-xs uppercase tracking-wider mb-2"
          style={{ color: "var(--text-tertiary)", fontSize: "10px", fontWeight: 500, letterSpacing: "0.05em" }}
        >
          执行日志
        </div>
        {logs.length === 0 && (
          <div className="text-xs py-4 text-center" style={{ color: "var(--text-tertiary)" }}>
            等待任务开始
          </div>
        )}
        <div className="space-y-1.5">
          {logs.slice(-30).map((log, i) => {
            const cfg = AGENTS[log.agent as AgentType];
            const color = cfg ? AGENT_COLORS[log.agent as AgentType] : "var(--text-secondary)";
            return (
              <div key={i} className="flex gap-2 animate-fade-up">
                <div
                  className="w-1 rounded-full flex-shrink-0 mt-0.5"
                  style={{ background: color, minHeight: 14 }}
                />
                <div className="text-xs leading-relaxed" style={{ color: "var(--text-secondary)" }}>
                  <span style={{ color, fontWeight: 500, fontSize: "11px" }}>
                    {cfg?.shortName || log.agent}
                  </span>
                  <span className="mx-1" style={{ color: "var(--text-tertiary)" }}>·</span>
                  {log.log}
                </div>
              </div>
            );
          })}
          <div ref={logsEndRef} />
        </div>
      </div>
    </div>
  );
}
