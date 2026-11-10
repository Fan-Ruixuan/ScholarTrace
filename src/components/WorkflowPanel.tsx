'use client';

import { AGENTS } from '@/lib/agent-config';
import type { AgentType } from '@/lib/types';
import {
  Brain,
  FileSearch,
  Calculator,
  FileText,
  ShieldCheck,
  CheckCircle2,
  Loader2,
  Circle,
  AlertCircle,
} from 'lucide-react';

type WorkflowPanelProps = {
  plan: {
    intent: string;
    description: string;
    tasks: Array<{
      agent: AgentType;
      description: string;
      dependsOn: AgentType[];
    }>;
  } | null;
  agents: Record<string, {
    status: 'pending' | 'running' | 'done' | 'error';
    progress: number;
    logs: string[];
    output?: Record<string, unknown>;
  }>;
  knowledgeBases: Array<{
    level: 'L1' | 'L2' | 'L3';
    name: string;
    desc: string;
    count: number;
  }>;
};

const AgentIcon = ({ type, size = 13 }: { type: AgentType; size?: number }) => {
  const map: Record<AgentType, React.ReactNode> = {
    orchestrator: <Brain size={size} />,
    parse: <FileSearch size={size} />,
    data: <Calculator size={size} />,
    report: <FileText size={size} />,
    check: <ShieldCheck size={size} />,
  };
  return <>{map[type]}</>;
};

const StatusIcon = ({ status }: { status: string }) => {
  if (status === 'running') return <Loader2 size={12} className="animate-spin" />;
  if (status === 'done') return <CheckCircle2 size={12} />;
  if (status === 'error') return <AlertCircle size={12} />;
  return <Circle size={12} />;
};

const statusLabel: Record<string, string> = {
  pending: '等待',
  running: '执行中',
  done: '完成',
  error: '出错',
};

export function WorkflowPanel({ plan, agents, knowledgeBases }: WorkflowPanelProps) {
  const agentOrder: AgentType[] = ['orchestrator', 'parse', 'data', 'report', 'check'];
  const currentAgent = agentOrder.find((a) => agents[a]?.status === 'running');

  return (
    <aside className="workflow-panel">
      <div className="panel-header">
        <div className="panel-title">任务执行</div>
        <div className="panel-subtitle">
          {plan ? plan.description : '等待任务开始'}
        </div>
      </div>

      {/* 执行计划 */}
      {plan && (
        <div className="panel-section">
          <div className="panel-section-title">执行计划</div>
          <div className="plan-box">
            <div className="plan-intent">{plan.intent}</div>
            <div className="plan-desc">{plan.description}</div>
          </div>
        </div>
      )}

      {/* Agent节点 */}
      <div className="panel-section" style={{ flex: 1, overflowY: 'auto' }}>
        <div className="panel-section-title">工作流</div>
        <div className="agent-nodes">
          {agentOrder.map((agentType) => {
            const config = AGENTS[agentType];
            const state = agents[agentType] || { status: 'pending' as const, progress: 0, logs: [] };
            const isRunning = state.status === 'running';
            const isDone = state.status === 'done';
            const isError = state.status === 'error';
            const logs = state.logs || [];

            return (
              <div
                key={agentType}
                className={`agent-node ${state.status}`}
                style={{ '--agent-color': config.color } as React.CSSProperties}
              >
                <div className="agent-node-content">
                  <div className="agent-node-header">
                    <span style={{ color: config.color, display: 'flex' }}>
                      <AgentIcon type={agentType} />
                    </span>
                    <span className="agent-node-name">{config.name}</span>
                    <span className={`agent-node-status ${state.status}`}>
                      {isRunning && <Loader2 size={10} className="inline animate-spin mr-1" />}
                      {isDone && <CheckCircle2 size={10} className="inline mr-1" />}
                      {isError && <AlertCircle size={10} className="inline mr-1" />}
                      {statusLabel[state.status]}
                    </span>
                  </div>

                  {isRunning && (
                    <div className="agent-node-progress">
                      <div
                        className="agent-node-progress-bar"
                        style={{ width: `${state.progress}%` }}
                      />
                    </div>
                  )}

                  {logs.length > 0 && (
                    <div className="agent-logs">
                      {logs.slice(-3).map((log, i) => (
                        <div className="agent-log-line" key={i}>
                          <span className="agent-log-text">{log}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* 输出摘要 */}
                  {isDone && state.output && agentType === 'data' && !!(state.output as Record<string, unknown>).record_id && (
                    <div style={{ fontSize: '11px', color: '#d97706', marginTop: 4 }}>
                      已完成清洗与标注
                    </div>
                  )}
                  {isDone && state.output && agentType === 'check' && (state.output as Record<string, unknown>).passed !== undefined && (
                    <div style={{ fontSize: '11px', color: String((state.output as Record<string, unknown>).passed) === 'true' ? '#16a34a' : '#dc2626', marginTop: 4 }}>
                      {String((state.output as Record<string, unknown>).passed) === 'true' ? '校验通过' : '存在问题需修正'}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 知识库 */}
      <div className="panel-section">
        <div className="panel-section-title">知识库</div>
        <div className="kb-list">
          {knowledgeBases.map((kb) => (
            <div key={kb.level} className="kb-item">
              <div className={`kb-dot ${kb.level.toLowerCase()}`} />
              <div className="kb-info">
                <div className="kb-name">{kb.name}</div>
                <div className="kb-desc">{kb.desc}</div>
              </div>
              <div className="kb-count">{kb.count}</div>
            </div>
          ))}
        </div>
      </div>
    </aside>
  );
}
