'use client';

import { AgentNode, AgentType, Plan } from '@/lib/types';
import { getAgentIcon, getAgentColor, getAgentName } from '@/lib/agent-config';
import {
  CheckCircle2,
  Loader2,
  AlertCircle,
  RotateCcw,
  Clock,
  Database,
  ChevronDown,
  ChevronRight,
  Zap,
  Layers,
} from 'lucide-react';
import { useState } from 'react';

interface WorkflowPanelProps {
  nodes: AgentNode[];
  plan?: Plan;
  currentAgent?: AgentType;
  kbState: {
    L1: { lastAction?: string; lastDetail?: string; accessed: boolean };
    L2: { lastAction?: string; lastDetail?: string; accessed: boolean };
    L3: { lastAction?: string; lastDetail?: string; accessed: boolean };
  };
  retryInfo: { from: AgentType; to: AgentType; reason: string; count: number } | null;
}

function StatusIcon({ status }: { status: AgentNode['status'] }) {
  switch (status) {
    case 'running':
      return <Loader2 className="w-4 h-4 animate-spin" />;
    case 'done':
      return <CheckCircle2 className="w-4 h-4" />;
    case 'error':
      return <AlertCircle className="w-4 h-4" />;
    case 'retry':
      return <RotateCcw className="w-4 h-4 animate-spin" />;
    default:
      return <Clock className="w-4 h-4 opacity-40" />;
  }
}

function AgentCard({ node, isActive, isLast }: { node: AgentNode; isActive: boolean; isLast: boolean }) {
  const colors = getAgentColor(node.type);
  const [expanded, setExpanded] = useState(false);
  const hasLogs = (node.logs?.length || 0) > 0;

  return (
    <div className="relative">
      {/* 连接线 */}
      {!isLast && (
        <div className="absolute left-[19px] top-10 w-0.5 h-8 overflow-hidden">
          <div className={`h-full w-full ${node.status === 'done' ? colors.bg : 'bg-slate-700/50'} ${node.status === 'running' ? 'animate-pulse' : ''}`} />
          {node.status === 'done' && (
            <div className="absolute top-0 w-full h-1 bg-gradient-to-b from-white/40 to-transparent" />
          )}
        </div>
      )}

      <div
        onClick={() => hasLogs && setExpanded(!expanded)}
        className={`relative flex items-start gap-3 rounded-xl border transition-all duration-300 ${
          isActive
            ? `${colors.border} ${colors.bgLight} bg-opacity-50 shadow-lg`
            : node.status === 'done'
            ? 'border-slate-700/50 bg-slate-800/30'
            : node.status === 'error'
            ? 'border-red-500/50 bg-red-900/20'
            : 'border-slate-700/30 bg-slate-800/10'
        } ${hasLogs ? 'cursor-pointer hover:bg-slate-800/40' : ''} p-3`}
      >
        {/* 图标 */}
        <div className={`relative flex-shrink-0 w-10 h-10 rounded-lg ${colors.bg} flex items-center justify-center text-white shadow-md ${
          node.status === 'running' ? 'animate-glow-pulse' : ''
        }`}>
          {getAgentIcon(node.type, 'w-5 h-5')}
          {node.status === 'running' && (
            <span className={`absolute inset-0 rounded-lg ${colors.bg} animate-ping opacity-30`} />
          )}
        </div>

        {/* 内容 */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className={`font-semibold text-sm ${
                isActive ? colors.textDark : node.status === 'pending' ? 'text-slate-500' : 'text-slate-200'
              }`}>
                {node.name}
              </span>
              {node.retryCount !== undefined && node.retryCount > 0 && (
                <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-amber-500/20 text-amber-400 text-[10px] font-medium">
                  <RotateCcw className="w-2.5 h-2.5" />
                  重试{node.retryCount}
                </span>
              )}
            </div>
            <div className={`flex-shrink-0 ${
              node.status === 'running' ? 'text-blue-400' :
              node.status === 'done' ? 'text-emerald-400' :
              node.status === 'error' ? 'text-red-400' :
              node.status === 'retry' ? 'text-amber-400' :
              'text-slate-500'
            }`}>
              <StatusIcon status={node.status} />
            </div>
          </div>

          <p className="text-xs text-slate-400 mt-0.5 truncate">{node.description}</p>

          {node.message && (
            <p className={`text-xs mt-1.5 ${
              node.status === 'error' ? 'text-red-300' : 'text-slate-300'
            }`}>
              {node.message}
            </p>
          )}

          {/* 进度条 */}
          {(node.status === 'running' || node.status === 'retry') && node.progress !== undefined && (
            <div className="mt-2 h-1 bg-slate-700/50 rounded-full overflow-hidden">
              <div
                className={`h-full ${colors.bg} transition-all duration-300 rounded-full`}
                style={{ width: `${node.progress}%` }}
              />
            </div>
          )}

          {/* 输出记录ID */}
          {node.recordIds && node.recordIds.length > 0 && node.status === 'done' && (
            <div className="mt-1.5 flex items-center gap-1 flex-wrap">
              {node.recordIds.slice(0, 3).map(id => (
                <span key={id} className="inline-block px-1.5 py-0.5 text-[10px] font-mono bg-slate-900/60 text-slate-400 rounded border border-slate-700/50">
                  {id.length > 18 ? id.slice(0, 18) + '…' : id}
                </span>
              ))}
              {node.recordIds.length > 3 && (
                <span className="text-[10px] text-slate-500">+{node.recordIds.length - 3}</span>
              )}
            </div>
          )}

          {/* 展开日志 */}
          {hasLogs && (
            <div className="flex items-center gap-1 mt-1 text-[10px] text-slate-500">
              {expanded ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
              {node.logs?.length} 条日志
            </div>
          )}
        </div>
      </div>

      {/* 日志面板 */}
      {expanded && hasLogs && (
        <div className="ml-12 mb-2 mt-1 rounded-lg bg-black/30 border border-slate-800 p-2 max-h-32 overflow-y-auto custom-scrollbar">
          {node.logs?.map((log, i) => (
            <div key={i} className="text-[11px] font-mono text-slate-400 leading-relaxed break-all">
              {log}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function KnowledgeLayer({
  level, title, color, state, icon,
}: {
  level: 'L1' | 'L2' | 'L3';
  title: string;
  color: string;
  state: { lastAction?: string; lastDetail?: string; accessed: boolean };
  icon: React.ReactNode;
}) {
  return (
    <div className={`rounded-lg border transition-all duration-500 ${
      state.accessed
        ? `${color} shadow-sm`
        : 'border-slate-700/30 bg-slate-800/20 opacity-60'
    } p-2.5`}>
      <div className="flex items-center gap-2">
        <div className={`w-7 h-7 rounded flex items-center justify-center text-xs font-bold ${
          state.accessed ? 'bg-white/20 text-white' : 'bg-slate-700/50 text-slate-500'
        }`}>
          {icon}
        </div>
        <div className="flex-1 min-w-0">
          <div className={`text-xs font-semibold ${state.accessed ? '' : 'text-slate-500'}`}>
            {level} {title}
          </div>
          {state.lastDetail && (
            <div className="text-[10px] text-slate-400 truncate mt-0.5">
              {state.lastAction === 'read' ? '📖' : '✏️'} {state.lastDetail}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export function WorkflowPanel({ nodes, plan, currentAgent, kbState, retryInfo }: WorkflowPanelProps) {
  const completedCount = nodes.filter(n => n.status === 'done').length;
  const runningCount = nodes.filter(n => n.status === 'running' || n.status === 'retry').length;
  const totalProgress = Math.round((completedCount / nodes.length) * 100);

  return (
    <aside className="w-[340px] flex-shrink-0 border-l border-slate-800/50 bg-slate-900/40 backdrop-blur-xl flex flex-col overflow-hidden">
      {/* 顶部：标题与全局进度 */}
      <div className="p-4 border-b border-slate-800/50">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
              <Zap className="w-4 h-4 text-white" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-100">Agent 编排</h2>
              <p className="text-[10px] text-slate-500">多智能体协作调度中心</p>
            </div>
          </div>
          {runningCount > 0 && (
            <span className="flex items-center gap-1 px-2 py-1 rounded-full bg-blue-500/20 text-blue-400 text-[10px] font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" />
              执行中
            </span>
          )}
        </div>

        {/* 整体进度 */}
        <div className="relative h-1.5 bg-slate-800 rounded-full overflow-hidden">
          <div
            className="absolute inset-y-0 left-0 bg-gradient-to-r from-blue-500 via-cyan-400 to-emerald-400 transition-all duration-500 rounded-full"
            style={{ width: `${totalProgress}%` }}
          />
        </div>
        <div className="flex justify-between mt-1.5 text-[10px] text-slate-500">
          <span>{completedCount}/{nodes.length} 个Agent完成</span>
          <span>{totalProgress}%</span>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-4">
        {/* 意图识别Plan */}
        {plan && (
          <div className="rounded-xl border border-blue-500/20 bg-blue-500/5 p-3">
            <div className="flex items-center gap-2 mb-2">
              <BrainIcon />
              <span className="text-xs font-semibold text-blue-300">执行计划</span>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed mb-2">{plan.intent}</p>
            <div className="space-y-1">
              {plan.tasks.map((task, i) => (
                <div key={task.id} className="flex items-center gap-2 text-[11px]">
                  <div className={`w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-bold flex-shrink-0 ${
                    task.status === 'done' ? 'bg-emerald-500 text-white' :
                    task.status === 'running' ? 'bg-blue-500 text-white animate-pulse' :
                    task.status === 'error' ? 'bg-red-500 text-white' :
                    'bg-slate-700 text-slate-400'
                  }`}>
                    {task.status === 'done' ? '✓' : task.status === 'running' ? '…' : task.status === 'error' ? '!' : i + 1}
                  </div>
                  <span className={task.status === 'pending' ? 'text-slate-500' : 'text-slate-300'}>
                    {task.name}
                  </span>
                  {task.parallel && (
                    <span className="px-1 py-0.5 rounded bg-purple-500/20 text-purple-300 text-[9px]">并行</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 重试提示 */}
        {retryInfo && (
          <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 animate-pulse-slow">
            <div className="flex items-center gap-2 mb-1">
              <RotateCcw className="w-4 h-4 text-amber-400" />
              <span className="text-xs font-semibold text-amber-300">闭环重试（第{retryInfo.count}次）</span>
            </div>
            <p className="text-[11px] text-amber-200/80 leading-relaxed">{retryInfo.reason}</p>
          </div>
        )}

        {/* Agent节点列表 */}
        <div className="space-y-0.5">
          {nodes.map((node, i) => (
            <AgentCard
              key={node.id}
              node={node}
              isActive={currentAgent === node.type}
              isLast={i === nodes.length - 1}
            />
          ))}
        </div>

        {/* 三层知识库状态 */}
        <div>
          <div className="flex items-center gap-2 mb-2 px-1">
            <Layers className="w-3.5 h-3.5 text-slate-400" />
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">三层知识库</span>
          </div>
          <div className="space-y-2">
            <KnowledgeLayer
              level="L1"
              title="原始文献库"
              color="border-slate-500/40 bg-slate-700/30 text-slate-200"
              state={kbState.L1}
              icon={<Database className="w-3.5 h-3.5" />}
            />
            <KnowledgeLayer
              level="L2"
              title="结构化知识库"
              color="border-cyan-500/40 bg-cyan-500/10 text-cyan-100"
              state={kbState.L2}
              icon={<Database className="w-3.5 h-3.5" />}
            />
            <KnowledgeLayer
              level="L3"
              title="规则校验库"
              color="border-amber-500/40 bg-amber-500/10 text-amber-100"
              state={kbState.L3}
              icon={<Database className="w-3.5 h-3.5" />}
            />
          </div>
          <p className="text-[10px] text-slate-500 mt-2 px-1 leading-relaxed">
            数据流：L1（原文保真）→ 解析写入 → L2（结构化快取）→ 校验时读L2+L3，必要时回L1核对
          </p>
        </div>
      </div>
    </aside>
  );
}

function BrainIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-blue-400">
      <path d="M9.5 2A2.5 2.5 0 0 1 12 4.5v15a2.5 2.5 0 0 1-4.96.44 2.5 2.5 0 0 1-2.96-3.08 3 3 0 0 1-.34-5.58 2.5 2.5 0 0 1 1.32-4.24 2.5 2.5 0 0 1 1.98-3A2.5 2.5 0 0 1 9.5 2Z"/>
      <path d="M14.5 2A2.5 2.5 0 0 0 12 4.5v15a2.5 2.5 0 0 0 4.96.44 2.5 2.5 0 0 0 2.96-3.08 3 3 0 0 0 .34-5.58 2.5 2.5 0 0 0-1.32-4.24 2.5 2.5 0 0 0-1.98-3A2.5 2.5 0 0 0 14.5 2Z"/>
    </svg>
  );
}
