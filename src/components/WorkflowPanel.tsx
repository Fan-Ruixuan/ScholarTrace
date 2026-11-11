import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Brain, Layers, Activity, ChevronDown, ChevronRight,
  Play, Pause, RotateCcw, Download
} from 'lucide-react';
import type {
  AgentState, AgentType, Plan, AgentLog, TimelineEvent
} from '@/lib/types';
import { AGENT_CONFIGS } from '@/lib/agent-config';

/* ============================================================================
   常量层 —— 纯数据，零逻辑
   ========================================================================== */

/** 拓扑 viewBox 尺寸 */
const VB_W = 300;
const VB_H = 260;

/** 节点坐标（主控居中顶、解析/数据左右并列、报告/校验垂直串行） */
const NODE_POS: Record<AgentType, { x: number; y: number }> = {
  orchestrator: { x: 150, y: 38 },
  parse:        { x: 72, y: 102 },
  data:         { x: 228, y: 102 },
  report:       { x: 150, y: 166 },
  check:        { x: 150, y: 228 },
};

/** 连线定义：主控→(解析,数据)并行，解析/数据→报告→校验串行 */
const EDGES: { from: AgentType; to: AgentType }[] = [
  { from: 'orchestrator', to: 'parse' },
  { from: 'orchestrator', to: 'data' },
  { from: 'parse',        to: 'report' },
  { from: 'data',         to: 'report' },
  { from: 'report',       to: 'check' },
];

const AGENT_ORDER: AgentType[] = ['orchestrator', 'parse', 'data', 'report', 'check'];

/** 溯源光束路径：从结论节点向上追溯到证据节点 */
const BEAM_PATH_FROM_CITATION: Record<AgentType, AgentType[]> = {
  report: ['report', 'parse', 'orchestrator'],
  check:  ['check', 'report', 'parse', 'orchestrator'],
  parse:  ['parse', 'orchestrator'],
  data:   ['data', 'orchestrator'],
  orchestrator: ['orchestrator'],
};

/** 节点尺寸 */
const NODE_R = 18;                      // 环形进度半径
const NODE_CIRCUMFERENCE = 2 * Math.PI * NODE_R; // ≈ 113.1

/** 光点动画周期（毫秒，匀速） */
const DOT_PERIOD_MS = 3000;

/* ============================================================================
   纯函数层 —— 几何/状态计算，输入→输出无副作用
   ========================================================================== */

/** 连线中点 */
function edgeMidpoint(f: AgentType, t: AgentType) {
  const a = NODE_POS[f], b = NODE_POS[t];
  return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
}

/** 光点位置：根据 0-1 相位沿连线插值 */
function dotPos(f: AgentType, t: AgentType, phase: number) {
  const a = NODE_POS[f], b = NODE_POS[t];
  return { x: a.x + (b.x - a.x) * phase, y: a.y + (b.y - a.y) * phase };
}

/** agent 状态 → 节点填充色（CSS var，SVG 直接解析） */
function nodeColor(type: AgentType, s: AgentState['status']): string {
  if (s === 'done')   return 'var(--success)';
  if (s === 'error')  return 'var(--error)';
  if (s === 'retry')  return 'var(--warning)';
  if (s === 'pending') return 'rgba(148,163,184,0.15)';
  return AGENT_CONFIGS[type].color; // idle / running 用专属色
}

/** 连线状态色（激活=对应下游 agent 色，未激活=半透明灰） */
function edgeStrokeColor(
  f: AgentType, t: AgentType,
  agents: Record<AgentType, AgentState>,
  isBeam: boolean,
): string {
  if (isBeam) return 'var(--brand)';
  const targetState = agents[t].status;
  if (['running', 'done', 'error', 'retry'].includes(targetState)) {
    return AGENT_CONFIGS[t].color;
  }
  return 'rgba(148,163,184,0.25)';
}

/** 连线是否"活"（显示实线 + 光点流动） */
function isEdgeLive(
  f: AgentType, t: AgentType,
  agents: Record<AgentType, AgentState>,
): boolean {
  const fs = agents[f].status, ts = agents[t].status;
  if (fs === 'done' && (ts === 'running' || ts === 'done' || ts === 'retry')) return true;
  if (fs === 'running' && ts === 'pending') return true; // 刚开始时
  return false;
}

/** 根据引用所属节点返回需要高亮的连线 key 集合 */
function beamEdgeKeysFor(activeCitation: string | null, agents: Record<AgentType, AgentState>): Set<string> {
  const keys = new Set<string>();
  if (!activeCitation) return keys;
  // 简化：高亮所有从报告/校验向上追溯的链路——任何 parse→report / data→report / report→check 连线上游已完成的都算
  const upstreamDone = (a: AgentType) => agents[a].status === 'done';
  EDGES.forEach(e => {
    if (upstreamDone(e.from) && (agents[e.to].status === 'running' || agents[e.to].status === 'done')) {
      keys.add(`${e.from}→${e.to}`);
    }
  });
  // 额外高亮 report↔check 链路（结论链）
  if (agents.report.status === 'done' || agents.check.status === 'running') {
    keys.add('report→check');
  }
  return keys;
}

/** 连线唯一 key */
const edgeKey = (f: AgentType, t: AgentType) => `${f}→${t}`;

/* ============================================================================
   子组件：PlanBlock（折叠执行计划）
   ========================================================================== */

function PlanBlock({ plan }: { plan: Plan | null }) {
  const [open, setOpen] = useState(true);
  if (!plan) return null;
  return (
    <div className="topo-section">
      <div
        className="topo-section-title"
        style={{ cursor: 'pointer', userSelect: 'none' }}
        onClick={() => setOpen(!open)}
      >
        <Activity size={12} />
        <span style={{ flex: 1 }}>执行计划</span>
        {open ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
      </div>
      <div className="plan-intent">{plan.description}</div>
      {open && plan.tasks.map((t, i) => (
        <div key={i} className={`plan-step ${t.parallel ? 'parallel' : ''}`}>
          <span className="plan-step-dot" style={{ background: AGENT_CONFIGS[t.agent].color }} />
          <span>{t.description}</span>
        </div>
      ))}
    </div>
  );
}

/* ============================================================================
   子组件：TopologySvg（核心——SVG Agent 拓扑网络）
   ========================================================================== */

interface TopologySvgProps {
  agents: Record<AgentType, AgentState>;
  timelineEvents: TimelineEvent[];
  activeCitation: string | null;
}

interface FlowLabel {
  key: string;
  from: AgentType;
  to: AgentType;
  recordId: string;
  bornAt: number;
  duration: number;
}

function TopologySvg({ agents, timelineEvents, activeCitation }: TopologySvgProps) {
  /* ---- rAF 时钟：驱动光点匀速移动 ---- */
  const [elapsed, setElapsed] = useState<number>(0);
  const rafRef = useRef<number | null>(null);
  const startRef = useRef<number>(performance.now());

  useEffect(() => {
    const tick = () => {
      setElapsed(performance.now() - startRef.current);
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, []);

  /* ---- record_id 数据标签飞传：从 timelineEvents 提取 flow.pointer ---- */
  const [flowLabels, setFlowLabels] = useState<FlowLabel[]>([]);
  const lastFlowCountRef = useRef<number>(0);

  useEffect(() => {
    // 找出所有 flow.pointer 事件，新增的转成 FlowLabel
    const pointerEvents = timelineEvents.filter(e => e.kind === 'flow.pointer');
    const newLabels: FlowLabel[] = [];
    for (let i = lastFlowCountRef.current; i < pointerEvents.length; i++) {
      const e = pointerEvents[i] as Extract<TimelineEvent, { kind: 'flow.pointer' }>;
      newLabels.push({
        key: `${e.from}→${e.to}→${e.recordId}-${i}`,
        from: e.from, to: e.to,
        recordId: e.recordId,
        bornAt: e.ts,
        duration: 350, // ms，飞完即消失
      });
    }
    if (newLabels.length > 0) {
      setFlowLabels(prev => [...prev, ...newLabels]);
      lastFlowCountRef.current = pointerEvents.length;
    }
    // 清理过期标签（每秒扫一次）
    const cleanupInterval = setInterval(() => {
      const now = Date.now();
      setFlowLabels(prev => prev.filter(l => now - l.bornAt < l.duration));
    }, 200);
    return () => clearInterval(cleanupInterval);
  }, [timelineEvents]);

  /* ---- 溯源光束：基于 activeCitation 激活连线高亮 ---- */
  const beamKeys = useMemo(
    () => beamEdgeKeysFor(activeCitation, agents),
    [activeCitation, agents],
  );

  /* ---- 渲染 ---- */
  return (
    <svg
      className="topo-svg"
      width={VB_W} height={VB_H}
      viewBox={`0 0 ${VB_W} ${VB_H}`}
    >
      {/* ============ 连线层 ============ */}
      {EDGES.map(({ from, to }) => {
        const key = edgeKey(from, to);
        const live = isEdgeLive(from, to, agents);
        const isBeam = beamKeys.has(key);
        const phase = ((elapsed / DOT_PERIOD_MS)
          + (from.length + to.length) * 0.07) % 1; // 每根连线独立相位偏移
        const col = edgeStrokeColor(from, to, agents, isBeam);
        return (
          <g key={key}>
            {/* 连线主线条 */}
            <line
              x1={NODE_POS[from].x} y1={NODE_POS[from].y}
              x2={NODE_POS[to].x}   y2={NODE_POS[to].y}
              className={`topo-line ${live ? 'active' : ''} ${isBeam ? 'beam' : ''}`}
              stroke={col}
              strokeDasharray={live ? '0' : '4 3'}
              style={isBeam ? { filter: 'drop-shadow(0 0 4px var(--brand-glow))' } : undefined}
            />
            {/* 流动光点（只在 live 或 beam 时出现） */}
            {(live || isBeam) && (() => {
              const pos = dotPos(from, to, phase);
              return (
                <circle
                  className="topo-dot"
                  cx={pos.x} cy={pos.y}
                  fill={col}
                  style={{ filter: 'drop-shadow(0 0 2px currentColor)' }}
                />
              );
            })()}
            {/* record_id 飞传标签 */}
            {flowLabels
              .filter(l => l.from === from && l.to === to)
              .map(l => {
                const age = Date.now() - l.bornAt;
                if (age < 0 || age > l.duration) return null;
                const phase = age / l.duration;
                const pos = dotPos(from, to, phase);
                const mid = edgeMidpoint(from, to);
                // 文字方向：从 from→to 的方向角，水平连线不旋转
                const dx = NODE_POS[to].x - NODE_POS[from].x;
                const dy = NODE_POS[to].y - NODE_POS[from].y;
                const angle = Math.atan2(dy, dx) * 180 / Math.PI;
                // 透明度：开头淡入 20%、中间 100%、结尾淡出 20%
                const opacity = phase < 0.2 ? phase * 5 : phase > 0.8 ? (1 - phase) * 5 : 1;
                return (
                  <g key={l.key} transform={`translate(${pos.x},${pos.y})`}>
                    <rect
                      x={-28} y={-7}
                      width={56} height={14}
                      rx={3}
                      fill="rgba(12,18,32,0.88)"
                      stroke="var(--brand)"
                      strokeWidth={0.75}
                      opacity={opacity}
                    />
                    <text
                      className="flow-label"
                      x={0} y={3}
                      textAnchor="middle"
                      transform={angle > -30 && angle < 30 || angle > 150 || angle < -150
                        ? undefined
                        : `rotate(${angle})`}
                      opacity={opacity}
                    >
                      {l.recordId.length > 14 ? l.recordId.slice(0, 11) + '…' : l.recordId}
                    </text>
                  </g>
                );
              })}
          </g>
        );
      })}

      {/* ============ 节点层（置于连线之上，最后渲染） ============ */}
      {AGENT_ORDER.map(type => {
        const pos = NODE_POS[type];
        const state = agents[type];
        const col = nodeColor(type, state.status);
        const progress = state.progress ?? (state.status === 'done' ? 1 : state.status === 'running' ? 0.55 : 0);
        const dashOffset = NODE_CIRCUMFERENCE * (1 - Math.min(Math.max(progress, 0), 1));
        const cfg = AGENT_CONFIGS[type];

        return (
          <g key={type} className="topo-node">
            {/* 外层环形进度 */}
            <circle
              cx={pos.x} cy={pos.y} r={NODE_R}
              className="topo-node-ring"
              stroke={col}
              strokeOpacity={state.status === 'pending' ? 0.25 : 1}
              strokeDashoffset={dashOffset}
            />
            {/* 内圆 */}
            <circle
              cx={pos.x} cy={pos.y} r={NODE_R - 3}
              fill={col}
              opacity={state.status === 'pending' ? 0.12 : 0.92}
              style={state.status === 'running' ? { filter: `drop-shadow(0 0 6px ${AGENT_CONFIGS[type].color})` } : undefined}
            />
            {/* 状态 glyph */}
            {state.status === 'pending' ? (
              <circle cx={pos.x} cy={pos.y} r={3} fill="var(--text-tertiary)" />
            ) : state.status === 'running' ? (
              <g>
                {/* 小旋转 icon */}
                <g transform={`translate(${pos.x - 7}, ${pos.y - 7})`}>
                  <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 12a9 9 0 1 1-6.2-8.55" />
                  </svg>
                </g>
                <g style={{ transformOrigin: `${pos.x}px ${pos.y}px`, animation: 'spin 1s linear infinite' }}>
                  <circle cx={pos.x} cy={pos.y} r={0} />
                </g>
              </g>
            ) : state.status === 'done' ? (
              <text className="topo-node-state" fill="#fff">✓</text>
            ) : state.status === 'error' ? (
              <text className="topo-node-state" fill="#fff">!</text>
            ) : state.status === 'retry' ? (
              <text className="topo-node-state" fill="#fff" fontSize={11} dominantBaseline="central">
                ↻×{state.retryCount ?? 1}
              </text>
            ) : null}

            {/* 节点下方标签 */}
            <text
              className="topo-node-label"
              x={pos.x} y={pos.y + NODE_R + 14}
              fill={state.status === 'pending' ? 'var(--text-tertiary)' : 'var(--text-secondary)'}
            >
              {cfg.shortName}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

/* ============================================================================
   子组件：KBRings（三层知识库同心圆）
   ========================================================================== */

interface KBRingsProps {
  kbHits: { l1: number; l2: number; l3: number };
  timelineEvents: TimelineEvent[];
}

function KBRings({ kbHits, timelineEvents }: KBRingsProps) {
  /* 数据点飞入：新的 kb.access 事件触发时生成一次性飞入动画 */
  const [flyDots, setFlyDots] = useState<{ id: string; layer: 'L1' | 'L2' | 'L3'; bornAt: number; angle: number }[]>([]);
  const lastKbCountRef = useRef<number>(0);

  useEffect(() => {
    const kbAccessEvents = timelineEvents.filter(e => e.kind === 'kb.access');
    if (kbAccessEvents.length > lastKbCountRef.current) {
      for (let i = lastKbCountRef.current; i < kbAccessEvents.length; i++) {
        const ev = kbAccessEvents[i] as Extract<TimelineEvent, { kind: 'kb.access' }>;
        const angle = Math.random() * Math.PI * 2; // 随机角度飞入
        setFlyDots(prev => [...prev, {
          id: `kb-${ev.layer}-${i}`,
          layer: ev.layer,
          bornAt: ev.ts,
          angle,
        }]);
      }
      lastKbCountRef.current = kbAccessEvents.length;
    }
    // 250ms 后清理
    const t = setTimeout(() => setFlyDots(prev => prev.filter(d => Date.now() - d.bornAt < 260)), 270);
    return () => clearTimeout(t);
  }, [timelineEvents]);

  const RADIUS = { L1: 48, L2: 35, L3: 22 } as const;
  const COLORS = { L1: 'var(--l1)', L2: 'var(--l2)', L3: 'var(--l3)' } as const;
  const hits = { L1: kbHits.l1, L2: kbHits.l2, L3: kbHits.l3 } as const;

  return (
    <div className="topo-section">
      <div className="topo-section-title">
        <Layers size={12} />
        知识库
      </div>
      <div className="kb-rings">
        <svg width={110} height={110} viewBox="0 0 110 110" className="kb-ring-svg">
          {/* 三层环 */}
          {(['L1', 'L2', 'L3'] as const).map(layer => {
            const r = RADIUS[layer];
            const col = COLORS[layer];
            const hit = hits[layer];
            const opacity = hit > 0 ? 0.85 : 0.25;
            return (
              <g key={layer}>
                {/* 底层细环 */}
                <circle cx={55} cy={55} r={r} fill="none" stroke="rgba(148,163,184,0.12)" strokeWidth={3} />
                {/* 数据进度段（顺时针从 -90° 起） */}
                <circle
                  cx={55} cy={55} r={r} fill="none"
                  stroke={col} strokeWidth={3} strokeLinecap="round"
                  strokeDasharray={`${NODE_CIRCUMFERENCE * Math.min(hit / 20, 1)} ${NODE_CIRCUMFERENCE}`}
                  strokeDashoffset={NODE_CIRCUMFERENCE * 0.25}
                  transform="rotate(-90 55 55)"
                  opacity={opacity}
                />
                {/* 数据点飞入 */}
                {flyDots
                  .filter(d => d.layer === layer)
                  .map(d => {
                    const age = Date.now() - d.bornAt;
                    if (age < 0 || age > 260) return null;
                    const t = age / 260; // 0 → 1
                    // 从中心 (0,0) 沿 angle 方向飞到环上 (r*cos, r*sin)
                    const cx = 55 + r * Math.cos(d.angle) * t;
                    const cy = 55 + r * Math.sin(d.angle) * t;
                    const size = 3 * (1 - t) + 1.5;
                    return (
                      <circle
                        key={d.id}
                        cx={cx} cy={cy}
                        r={size}
                        fill={col}
                        opacity={1 - t}
                        style={{ filter: `drop-shadow(0 0 4px ${col})` }}
                      />
                    );
                  })}
              </g>
            );
          })}
          {/* 中心文字 */}
          <text x={55} y={58} textAnchor="middle" fontSize={10} fill="var(--text-tertiary)" fontWeight={500}>三层库</text>
        </svg>
        <div className="kb-ring-info">
          {(['L1', 'L2', 'L3'] as const).map(layer => (
            <div className="kb-ring-item" key={layer}>
              <span className="kb-dot" style={{ background: COLORS[layer] }} />
              {layer === 'L1' ? '原始库' : layer === 'L2' ? '结构化库' : '规则库'}
              <span className="kb-ring-item-count">{hits[layer]}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ============================================================================
   子组件：LogStream（执行日志流）
   ========================================================================== */

function LogStream({ logs }: { logs: AgentLog[] }) {
  const recent = logs.slice(-5);
  if (recent.length === 0) return null;
  return (
    <div className="topo-section">
      <div className="topo-section-title">执行日志</div>
      <div className="log-list">
        {recent.map((log, i) => {
          const cfg = AGENT_CONFIGS[log.agent];
          const isLatest = i === recent.length - 1;
          return (
            <div key={i} className="log-item" style={{ opacity: isLatest ? 1 : 0.65 }}>
              <span className="log-dot" style={{ background: cfg.color }} />
              <span className="log-text">{log.log}</span>
              <span className="log-time">{log.time}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ============================================================================
   快照引擎 —— 给定时刻的 timelineEvents → 重建那一刻的 agents/logs/kbHits
   ========================================================================== */

interface ReplaySnapshot {
  agents: Record<AgentType, AgentState>;
  logs: AgentLog[];
  kbHits: { l1: number; l2: number; l3: number };
}

/** 初始状态（所有节点 pending） */
function emptyAgents(): Record<AgentType, AgentState> {
  return AGENT_ORDER.reduce((acc, a) => {
    acc[a] = { status: 'pending', message: '', progress: 0, logs: [] };
    return acc;
  }, {} as Record<AgentType, AgentState>);
}

/** 根据时间戳从 timelineEvents 重建那一刻的状态（纯函数） */
function snapshotAt(events: TimelineEvent[], ts: number): ReplaySnapshot {
  const agents = emptyAgents();
  const logs: AgentLog[] = [];
  let l1 = 0, l2 = 0, l3 = 0;

  for (const ev of events) {
    if (ev.ts > ts) break; // 时间戳有序，提前终止

    switch (ev.kind) {
      case 'node.status':
        agents[ev.agent] = {
          status: ev.status,
          progress: ev.status === 'done' ? 1 : ev.progress ?? agents[ev.agent].progress,
          message: ev.message ?? agents[ev.agent].message,
          logs: agents[ev.agent].logs,
          retryCount: ev.status === 'retry' ? ((agents[ev.agent].retryCount ?? 0) + 1) : agents[ev.agent].retryCount,
        };
        break;
      case 'agent.log':
        logs.push({
          agent: ev.agent,
          log: ev.log,
          time: new Date(ev.ts).toLocaleTimeString('zh-CN', { hour12: false }),
        });
        break;
      case 'kb.access':
        if (ev.layer === 'L1') l1++;
        else if (ev.layer === 'L2') l2++;
        else l3++;
        break;
      case 'flow.pointer':
      case 'retry.loop':
      case 'done':
        break;
    }
  }

  return { agents, logs, kbHits: { l1, l2, l3 } };
}

/* ============================================================================
   TimelineReplayer —— 时间轴回放滑块
   ========================================================================== */

interface TimelineReplayerProps {
  events: TimelineEvent[];
  liveAgents: Record<AgentType, AgentState>;
  onReplayUpdate: (snapshot: ReplaySnapshot) => void;
  onExit: () => void;
}

function TimelineReplayer({ events, liveAgents, onReplayUpdate, onExit }: TimelineReplayerProps) {
  // 确定时间范围（用最后一个事件的 ts，或者所有 live agent 都 done 的时间作为结束点）
  const { minTs, maxTs } = useMemo(() => {
    if (events.length === 0) return { minTs: 0, maxTs: 0 };
    const allDone = AGENT_ORDER.every(a => liveAgents[a].status === 'done');
    const lastTs = events[events.length - 1].ts;
    return {
      minTs: events[0].ts,
      maxTs: allDone ? lastTs : lastTs, // 未完成时仍可回放已发生的部分
    };
  }, [events, liveAgents]);

  const [replayTs, setReplayTs] = useState<number>(maxTs);
  const [autoPlay, setAutoPlay] = useState<boolean>(false);
  const rafRef = useRef<number | null>(null);

  // 自动播放：从 minTs 匀速推进到 maxTs
  useEffect(() => {
    if (!autoPlay) return;
    let startMs = performance.now();
    const startTs = replayTs;
    const totalDuration = Math.max(maxTs - minTs, 1);
    const SIMULATION_MS = 8000; // 8秒播完
    const tick = () => {
      const elapsed = performance.now() - startMs;
      const progress = Math.min(elapsed / SIMULATION_MS, 1);
      const newTs = startTs + (maxTs - startTs) * progress;
      setReplayTs(newTs);
      if (progress < 1) {
        rafRef.current = requestAnimationFrame(tick);
      } else {
        setAutoPlay(false);
      }
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, [autoPlay, minTs, maxTs]);

  // replayTs 变化时更新快照
  useEffect(() => {
    onReplayUpdate(snapshotAt(events, replayTs));
  }, [replayTs, events, onReplayUpdate]);

  const fmt = (ts: number) => {
    // 用第一个事件的 ts 作为相对起点，显示经过的秒数
    const relMs = ts - minTs;
    const sec = Math.floor(relMs / 1000);
    if (sec < 60) return `${sec}s`;
    const min = Math.floor(sec / 60);
    return `${min}m${sec % 60}s`;
  };

  if (events.length < 2) return null;

  const progress = Math.round(((replayTs - minTs) / Math.max(maxTs - minTs, 1)) * 100);

  return (
    <div className="topo-section" style={{ background: 'rgba(22,32,52,0.50)' }}>
      <div className="topo-section-title" style={{ marginBottom: 12 }}>
        <Activity size={12} />
        工作流时间轴回放
        <span style={{ marginLeft: 'auto', fontSize: 10, color: 'var(--text-tertiary)' }}>
          回放中
        </span>
      </div>
      <div style={{ padding: '0 2px' }}>
        <div
          className="topo-section"
          style={{ background: 'rgba(59,130,246,0.08)', padding: '6px 10px', margin: 0 }}
        >
          <div style={{
            width: `${progress}%`, height: 3,
            background: 'var(--brand)',
            borderRadius: 2,
            transition: autoPlay ? 'none' : 'width 100ms',
          }} />
        </div>
        <div style={{
          display: 'flex', alignItems: 'center', gap: 10, marginTop: 8,
          fontFamily: "'JetBrains Mono', monospace", fontSize: 11,
          color: 'var(--text-tertiary)',
        }}>
          <span>{fmt(minTs)}</span>
          <input
            type="range"
            min={minTs}
            max={maxTs}
            value={replayTs}
            onChange={(e) => { setAutoPlay(false); setReplayTs(parseInt(e.target.value)); }}
            style={{
              flex: 1, height: 4, cursor: 'pointer',
              accentColor: 'var(--brand)',
            }}
          />
          <span>{fmt(maxTs)}</span>
        </div>
        <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
          <button
            className="btn"
            style={{ padding: '4px 10px', fontSize: 12 }}
            onClick={() => setAutoPlay(!autoPlay)}
          >
            {autoPlay ? <Pause size={12} /> : <Play size={12} />}
            {autoPlay ? '暂停' : '重播'}
          </button>
          <button
            className="btn"
            style={{ padding: '4px 10px', fontSize: 12 }}
            onClick={() => { setReplayTs(maxTs); setAutoPlay(false); }}
          >
            <RotateCcw size={12} />
            回到完成
          </button>
          <button
            className="btn-ghost"
            style={{ padding: '4px 10px', fontSize: 12, marginLeft: 'auto' }}
            onClick={onExit}
          >
            退出回放
          </button>
        </div>
      </div>
    </div>
  );
}

/* ============================================================================
   主组件 WorkflowPanel —— 组装子组件 + 回放模式切换
   ========================================================================== */

export default function WorkflowPanel({
  plan,
  agents,
  logs,
  kbHits,
  activeCitation,
  timelineEvents,
}: {
  plan: Plan | null;
  agents: Record<AgentType, AgentState>;
  logs: AgentLog[];
  kbHits: { l1: number; l2: number; l3: number };
  activeCitation: string | null;
  timelineEvents: TimelineEvent[];
}) {
  const [isReplaying, setIsReplaying] = useState(false);
  const [replaySnapshot, setReplaySnapshot] = useState<ReplaySnapshot | null>(null);

  // 检测是否有完整事件（>=3 条 timelineEvents 才有回放意义）
  const canReplay = timelineEvents.length >= 3;

  // 回放数据：回放模式用快照，否则用 props 实时数据
  const displayAgents = isReplaying && replaySnapshot ? replaySnapshot.agents : agents;
  const displayLogs = isReplaying && replaySnapshot ? replaySnapshot.logs : logs;
  const displayKb = isReplaying && replaySnapshot ? replaySnapshot.kbHits : kbHits;

  return (
    <div className="topo-panel">
      <PlanBlock plan={plan} />

      {/* Agent 拓扑网络 */}
      <div className="topo-section">
        <div className="topo-section-title">
          <Brain size={12} />
          Agent 拓扑
          {isReplaying && (
            <span style={{ marginLeft: 'auto', fontSize: 9, color: 'var(--warning)' }}>
              回放模式
            </span>
          )}
        </div>
        <TopologySvg
          agents={displayAgents}
          timelineEvents={timelineEvents}
          activeCitation={activeCitation}
        />
      </div>

      {/* 三层知识库同心环 */}
      <KBRings kbHits={displayKb} timelineEvents={timelineEvents} />

      {/* 执行日志流 */}
      <LogStream logs={displayLogs} />

      {/* 回放入口 / 回放面板 */}
      {canReplay && !isReplaying && (
        <div style={{ display: 'flex', justifyContent: 'center' }}>
          <button
            className="btn-ghost"
            onClick={() => {
              // 初始化快照为最后时刻（完成态）
              const lastTs = timelineEvents[timelineEvents.length - 1].ts;
              setReplaySnapshot(snapshotAt(timelineEvents, lastTs));
              setIsReplaying(true);
            }}
            style={{ fontSize: 11, color: 'var(--brand)' }}
          >
            <RotateCcw size={11} />
            回放工作流
          </button>
        </div>
      )}

      {isReplaying && (
        <TimelineReplayer
          events={timelineEvents}
          liveAgents={agents}
          onReplayUpdate={setReplaySnapshot}
          onExit={() => { setIsReplaying(false); setReplaySnapshot(null); }}
        />
      )}
    </div>
  );
}
