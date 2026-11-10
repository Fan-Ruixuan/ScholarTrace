import { useEffect, useRef, useState } from 'react';
import { Brain, Check, AlertCircle, Loader2, Circle, Layers, Activity } from 'lucide-react';
import type { AgentState, AgentType, Plan, AgentLog, PlanTask } from '@/lib/types';
import { AGENT_CONFIGS } from '@/lib/agent-config';

interface WorkflowPanelProps {
  plan: Plan | null;
  agents: Record<AgentType, AgentState>;
  logs: AgentLog[];
  kbHits: { l1: number; l2: number; l3: number };
  activeCitation: string | null;
}

interface TopologyPanelProps {
  plan: Plan | null;
  agents: Record<AgentType, AgentState>;
  logs: AgentLog[];
  kbHits: { l1: number; l2: number; l3: number };
  activeCitation: string | null;
}

const AGENT_ORDER: AgentType[] = ['orchestrator', 'parse', 'data', 'report', 'check'];

// 拓扑布局：节点坐标
const NODE_POSITIONS: Record<AgentType, { x: number; y: number }> = {
  orchestrator: { x: 150, y: 40 },
  parse: { x: 75, y: 100 },
  data: { x: 225, y: 100 },
  report: { x: 150, y: 160 },
  check: { x: 150, y: 220 },
};

// 连线定义
const EDGES: { from: AgentType; to: AgentType; parallel?: boolean }[] = [
  { from: 'orchestrator', to: 'parse' },
  { from: 'orchestrator', to: 'data' },
  { from: 'parse', to: 'report' },
  { from: 'data', to: 'report' },
  { from: 'report', to: 'check' },
];

// Agent图标（小SVG path）
const AGENT_ICONS: Record<AgentType, string> = {
  orchestrator: 'M9 3a1 1 0 0 1 1 1v1.07a7.002 7.002 0 0 1 6 6.93 1 1 0 1 1-2 0A5 5 0 1 0 9 8a1 1 0 0 1 0-2V4a1 1 0 0 1 0-1', // brain简化
  parse: 'M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z M14 2v6h6 M16 13H8 M16 17H8 M10 9H8',
  data: 'M3 3v18h18 M7 14l4-4 4 4 5-5',
  report: 'M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2 M9 5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v0a2 2 0 0 1-2 2h-2a2 2 0 0 1-2-2z M9 14h6 M9 18h6',
  check: 'M9 12l2 2 4-4 M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0z',
};

function AgentIcon({ type, color, size = 16 }: { type: AgentType; color: string; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d={AGENT_ICONS[type]} />
    </svg>
  );
}

function StatusGlyph({ status }: { status: AgentState['status'] }) {
  if (status === 'running') {
    return <Loader2 size={14} className="animate-spin" color="#fff" />;
  }
  if (status === 'done') {
    return <Check size={14} color="#fff" strokeWidth={3} />;
  }
  if (status === 'error') {
    return <AlertCircle size={14} color="#fff" strokeWidth={2.5} />;
  }
  return <Circle size={8} color="#fff" fill="#fff" fillOpacity={0.3} />;
}

export default function WorkflowPanel({ plan, agents, logs, kbHits, activeCitation }: WorkflowPanelProps) {
  const [time, setTime] = useState(0);
  const rafRef = useRef<number | null>(null);

  // 光点动画
  useEffect(() => {
    let start = performance.now();
    const animate = () => {
      setTime((performance.now() - start) / 3000); // 3s一个周期
      rafRef.current = requestAnimationFrame(animate);
    };
    rafRef.current = requestAnimationFrame(animate);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  // 获取节点颜色
  const getNodeColor = (type: AgentType): string => {
    const cfg = AGENT_CONFIGS[type];
    const state = agents[type];
    if (state.status === 'running') return cfg.color;
    if (state.status === 'done') return 'var(--success)';
    if (state.status === 'error') return 'var(--error)';
    return 'var(--border-active)';
  };

  // 获取连线颜色
  const getEdgeColor = (from: AgentType, to: AgentType): string => {
    const fromState = agents[from];
    const toState = agents[to];
    // 溯源光束：激活引用时高亮
    if (activeCitation) {
      if ((from === 'report' && to === 'check') || (from === 'parse' && to === 'report') || (from === 'data' && to === 'report')) {
        return 'var(--brand)';
      }
    }
    if (toState.status === 'running' || toState.status === 'done' || toState.status === 'error') {
      return AGENT_CONFIGS[to].color;
    }
    return 'var(--border)';
  };

  const isEdgeActive = (from: AgentType, to: AgentType): boolean => {
    const fromState = agents[from];
    const toState = agents[to];
    return (fromState.status === 'done' && (toState.status === 'running' || toState.status === 'done')) ||
      (activeCitation !== null && ((from === 'report' && to === 'check') || (from === 'parse' && to === 'report') || (from === 'data' && to === 'report')));
  };

  // 计算光点位置（0-1沿路径）
  const getDotPosition = (from: AgentType, to: AgentType) => {
    const f = NODE_POSITIONS[from];
    const t = NODE_POSITIONS[to];
    const phase = ((time + (from.length + to.length) * 0.1) % 1);
    return {
      x: f.x + (t.x - f.x) * phase,
      y: f.y + (t.y - f.y) * phase,
    };
  };

  const recentLogs = logs.slice(-6);

  return (
    <div className="topo-panel">
      {/* 执行计划 */}
      {plan && (
        <div className="topo-section">
          <div className="topo-section-title">
            <Activity size={12} />
            执行计划
          </div>
          <div className="plan-intent">{plan.description}</div>
          {plan.tasks.map((task: PlanTask, idx: number) => {
            const cfg = AGENT_CONFIGS[task.agent as AgentType];
            return (
              <div key={idx} className={`plan-step ${task.parallel ? 'parallel' : ''}`}>
                <span className="plan-step-dot" style={{ background: cfg.color }} />
                <span>{task.description}</span>
              </div>
            );
          })}
        </div>
      )}

      {/* Agent拓扑网络 */}
      <div className="topo-section">
        <div className="topo-section-title">
          <Brain size={12} />
          Agent 拓扑
        </div>
        <svg width="300" height="260" viewBox="0 0 300 260" className="topo-svg">
          {/* 连线 */}
          {EDGES.map((edge, i) => {
            const f = NODE_POSITIONS[edge.from];
            const t = NODE_POSITIONS[edge.to];
            const active = isEdgeActive(edge.from, edge.to);
            const color = getEdgeColor(edge.from, edge.to);
            return (
              <g key={i}>
                <line
                  x1={f.x}
                  y1={f.y}
                  x2={t.x}
                  y2={t.y}
                  className={`topo-line ${active ? 'active' : ''}`}
                  stroke={color}
                  strokeDasharray={active ? '0' : '4 3'}
                />
                {active && (
                  <circle
                    className="topo-dot"
                    fill={AGENT_CONFIGS[edge.to].color}
                    {...(() => {
                      const pos = getDotPosition(edge.from, edge.to);
                      return { cx: pos.x, cy: pos.y };
                    })()}
                  />
                )}
              </g>
            );
          })}

          {/* 节点 */}
          {AGENT_ORDER.map((type) => {
            const pos = NODE_POSITIONS[type];
            const cfg = AGENT_CONFIGS[type];
            const state = agents[type];
            const color = getNodeColor(type);
            const circumference = 2 * Math.PI * 18;
            const progress = state.progress ?? (state.status === 'done' ? 1 : state.status === 'running' ? 0.6 : 0);
            return (
              <g key={type} className="topo-node">
                {/* 外发光（仅running时） */}
                {state.status === 'running' && (
                  <circle cx={pos.x} cy={pos.y} r={24} fill={cfg.color} opacity={0.1} />
                )}
                {/* 进度环 */}
                <circle
                  cx={pos.x}
                  cy={pos.y}
                  r={18}
                  className="topo-node-ring"
                  stroke={state.status === 'pending' ? 'var(--border)' : color}
                  strokeDashoffset={circumference * (1 - progress)}
                  strokeOpacity={state.status === 'pending' ? 0.4 : 1}
                />
                {/* 内圆 */}
                <circle cx={pos.x} cy={pos.y} r={15} fill={color} opacity={state.status === 'pending' ? 0.15 : 1} />
                {/* 图标 */}
                {state.status === 'pending' ? (
                  <circle cx={pos.x} cy={pos.y} r={3} fill="#8a95ad" />
                ) : (
                  <g transform={`translate(${pos.x - 7}, ${pos.y - 7})`}>
                    <StatusGlyph status={state.status} />
                  </g>
                )}
                {/* 标签 */}
                <text x={pos.x} y={pos.y + 32} className="topo-node-label" fill={state.status === 'pending' ? 'var(--text-tertiary)' : 'var(--text-secondary)'}>
                  {cfg.name.replace('Agent', '').trim()}
                </text>
              </g>
            );
          })}
        </svg>
      </div>

      {/* 三层知识库环 */}
      <div className="topo-section">
        <div className="topo-section-title">
          <Layers size={12} />
          知识库
        </div>
        <div className="kb-rings">
          <svg width="110" height="110" viewBox="0 0 110 110" className="kb-ring-svg">
            {/* L1 外环 */}
            <circle cx="55" cy="55" r="48" fill="none" stroke="var(--border)" strokeWidth="3" />
            <circle
              cx="55" cy="55" r="48" fill="none"
              stroke="var(--l1)" strokeWidth="3"
              strokeDasharray={`${2 * Math.PI * 48 * Math.min(kbHits.l1 / 20, 1)} ${2 * Math.PI * 48}`}
              strokeDashoffset={2 * Math.PI * 48 * 0.25}
              transform="rotate(-90 55 55)"
              opacity={kbHits.l1 > 0 ? 0.8 : 0.25}
            />
            {/* L2 中环 */}
            <circle cx="55" cy="55" r="35" fill="none" stroke="var(--border)" strokeWidth="3" />
            <circle
              cx="55" cy="55" r="35" fill="none"
              stroke="var(--l2)" strokeWidth="3"
              strokeDasharray={`${2 * Math.PI * 35 * Math.min(kbHits.l2 / 20, 1)} ${2 * Math.PI * 35}`}
              strokeDashoffset={2 * Math.PI * 35 * 0.25}
              transform="rotate(-90 55 55)"
              opacity={kbHits.l2 > 0 ? 0.8 : 0.25}
            />
            {/* L3 内环 */}
            <circle cx="55" cy="55" r="22" fill="none" stroke="var(--border)" strokeWidth="3" />
            <circle
              cx="55" cy="55" r="22" fill="none"
              stroke="var(--l3)" strokeWidth="3"
              strokeDasharray={`${2 * Math.PI * 22 * Math.min(kbHits.l3 / 20, 1)} ${2 * Math.PI * 22}`}
              strokeDashoffset={2 * Math.PI * 22 * 0.25}
              transform="rotate(-90 55 55)"
              opacity={kbHits.l3 > 0 ? 0.8 : 0.25}
            />
            <text x="55" y="59" textAnchor="middle" fontSize="10" fill="var(--text-tertiary)" fontWeight="500">三层库</text>
          </svg>
          <div className="kb-ring-info">
            <div className="kb-ring-item">
              <span className="kb-dot" style={{ background: 'var(--l1)' }} />
              L1 原始库
              <span className="kb-ring-item-count">{kbHits.l1}</span>
            </div>
            <div className="kb-ring-item">
              <span className="kb-dot" style={{ background: 'var(--l2)' }} />
              L2 结构化库
              <span className="kb-ring-item-count">{kbHits.l2}</span>
            </div>
            <div className="kb-ring-item">
              <span className="kb-dot" style={{ background: 'var(--l3)' }} />
              L3 规则库
              <span className="kb-ring-item-count">{kbHits.l3}</span>
            </div>
          </div>
        </div>
      </div>

      {/* 执行日志 */}
      {recentLogs.length > 0 && (
        <div className="topo-section">
          <div className="topo-section-title">执行日志</div>
          <div className="log-list">
            {recentLogs.map((log: AgentLog, idx: number) => {
              const cfg = AGENT_CONFIGS[log.agent as AgentType];
              return (
                <div key={idx} className="log-item">
                  <span className="log-dot" style={{ background: cfg.color }} />
                  <span className="log-text" style={{ color: idx === recentLogs.length - 1 ? 'var(--text-primary)' : undefined }}>
                    {log.log}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
