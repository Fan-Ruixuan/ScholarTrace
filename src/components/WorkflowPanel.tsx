'use client';

import { AgentNode, AgentType, Plan } from '@/lib/types';
import { getAgentColor, getAgentDescription, getAgentIcon, getAgentName } from '@/lib/agent-config';
import { CheckCircle2, AlertCircle, Loader2, Clock, RotateCcw, ChevronDown, ChevronUp } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useState } from 'react';

interface WorkflowPanelProps {
  nodes: AgentNode[];
  plan?: Plan;
  currentAgent?: AgentType;
}

export function WorkflowPanel({ nodes, plan, currentAgent }: WorkflowPanelProps) {
  const [expandedNode, setExpandedNode] = useState<string | null>(null);

  const getStatusIcon = (status: AgentNode['status']) => {
    switch (status) {
      case 'done':
        return <CheckCircle2 className="w-4 h-4 text-green-500" />;
      case 'running':
        return <Loader2 className="w-4 h-4 text-blue-500 animate-spin" />;
      case 'error':
        return <AlertCircle className="w-4 h-4 text-red-500" />;
      case 'retry':
        return <RotateCcw className="w-4 h-4 text-amber-500" />;
      default:
        return <Clock className="w-4 h-4 text-slate-300" />;
    }
  };

  // 过滤有效节点（只显示已激活或已完成的，避免全部pending时界面太满）
  const visibleNodes = nodes.filter(n => n.status !== 'pending' || nodes.some(x => x.status !== 'pending'));
  const pendingNodes = nodes.filter(n => n.status === 'pending');

  return (
    <div className="h-full flex flex-col bg-white border-l border-slate-200">
      {/* 面板头部 */}
      <div className="px-4 py-3 border-b border-slate-200">
        <h2 className="text-sm font-semibold text-slate-800 flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
          Agent 编排状态
        </h2>
        <p className="text-xs text-slate-500 mt-0.5">多智能体协作流实时追踪</p>
      </div>

      <div className="flex-1 overflow-y-auto">
        {/* 意图识别 & 计划 */}
        {plan && (
          <div className="p-4 border-b border-slate-100">
            <div className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-2">
              执行计划
            </div>
            <div className="bg-blue-50 border border-blue-100 rounded-lg p-3">
              <div className="flex items-start gap-2">
                <div className="w-6 h-6 rounded-full bg-blue-600 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-white text-xs">智</span>
                </div>
                <div className="flex-1">
                  <div className="text-xs text-blue-700 font-medium">意图识别</div>
                  <div className="text-sm text-slate-700 mt-0.5">{plan.intent}</div>
                </div>
              </div>
              {plan.tasks.length > 0 && (
                <div className="mt-3 pt-2 border-t border-blue-100">
                  <div className="text-xs text-blue-700 font-medium mb-1.5">任务拆解</div>
                  <div className="space-y-1">
                    {plan.tasks.map((task, idx) => (
                      <div key={task.id} className="flex items-center gap-2 text-xs">
                        <span className="w-4 h-4 rounded-full bg-blue-200 text-blue-700 flex items-center justify-center text-[10px] font-medium">
                          {idx + 1}
                        </span>
                        <span className={cn(
                          task.status === 'done' ? 'text-green-700 line-through' :
                          task.status === 'running' ? 'text-blue-700 font-medium' :
                          'text-slate-600',
                        )}>
                          {task.name}
                        </span>
                        {task.parallel && (
                          <span className="text-[10px] px-1 rounded bg-cyan-100 text-cyan-700">并行</span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Agent节点列表 */}
        <div className="p-4 space-y-0">
          {visibleNodes.length === 0 && !plan && (
            <div className="text-center py-8">
              <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-3">
                <Loader2 className="w-6 h-6 text-slate-400" />
              </div>
              <p className="text-sm text-slate-500">等待发起任务</p>
              <p className="text-xs text-slate-400 mt-1">上传文献或发送指令后开始执行</p>
            </div>
          )}

          {visibleNodes.map((node, idx) => {
            const colors = getAgentColor(node.type);
            const isExpanded = expandedNode === node.id;
            const isActive = node.status === 'running';

            return (
              <div key={node.id}>
                {/* 连接线 */}
                {idx > 0 && (
                  <div className="flex justify-center h-6 relative">
                    <div className={cn(
                      'w-0.5 h-full',
                      visibleNodes[idx - 1].status === 'done' && visibleNodes[idx].status !== 'pending'
                        ? node.status === 'running' ? 'data-flow-line' : 'bg-slate-300'
                        : 'bg-slate-200',
                    )} />
                  </div>
                )}

                {/* 节点卡片 */}
                <div
                  className={cn(
                    'rounded-lg border transition-all duration-200',
                    isActive ? 'ring-2 ring-offset-1' : '',
                    node.status === 'done' ? `${colors.bgLight} ${colors.border}` :
                    node.status === 'running' ? `${colors.border} bg-white` :
                    node.status === 'error' ? 'bg-red-50 border-red-200' :
                    'bg-slate-50 border-slate-200',
                    isActive ? colors.text.replace('text-', 'ring-') : '',
                  )}
                >
                  <div
                    className="p-3 cursor-pointer"
                    onClick={() => setExpandedNode(isExpanded ? null : node.id)}
                  >
                    <div className="flex items-center gap-3">
                      {/* Agent图标 */}
                      <div className={cn(
                        'w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0',
                        isActive ? `${colors.bg} text-white node-pulse` :
                        node.status === 'done' ? `${colors.bg} text-white` :
                        node.status === 'error' ? 'bg-red-500 text-white' :
                        'bg-slate-200 text-slate-400',
                      )}>
                        {getAgentIcon(node.type, 'w-4 h-4')}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className={cn(
                            'text-sm font-medium',
                            node.status === 'pending' ? 'text-slate-500' :
                            node.status === 'error' ? 'text-red-700' :
                            colors.textDark,
                          )}>
                            {getAgentName(node.type)}
                          </span>
                          {node.retryCount && node.retryCount > 0 && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-100 text-amber-700">
                              重试 {node.retryCount}/2
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-500 mt-0.5 truncate">
                          {node.message || getAgentDescription(node.type)}
                        </p>
                      </div>

                      <div className="flex items-center gap-1.5 flex-shrink-0">
                        {node.status === 'running' && node.progress !== undefined && (
                          <span className="text-xs text-slate-500 font-mono">{node.progress}%</span>
                        )}
                        {getStatusIcon(node.status)}
                        {(node.message || node.output) ? (
                          isExpanded ? <ChevronUp className="w-3.5 h-3.5 text-slate-400" /> : <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                        ) : null}
                      </div>
                    </div>

                    {/* 进度条 */}
                    {isActive && node.progress !== undefined && (
                      <div className="mt-2 h-1 bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className={cn('h-full rounded-full transition-all duration-300', colors.bg)}
                          style={{ width: `${node.progress}%` }}
                        />
                      </div>
                    )}
                  </div>

                  {/* 展开详情 */}
                  {isExpanded && (node.message || node.output) && (
                    <div className="px-3 pb-3 border-t border-slate-100/50">
                      <div className="mt-2 text-xs text-slate-600 bg-white/60 rounded p-2 font-mono max-h-32 overflow-y-auto whitespace-pre-wrap">
                        {node.output || node.message}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}

          {/* 待执行节点 */}
          {pendingNodes.length > 0 && visibleNodes.length > 0 && (
            <div className="mt-2 text-center">
              <p className="text-xs text-slate-400 py-2">
                还有 {pendingNodes.length} 个节点等待执行...
              </p>
            </div>
          )}
        </div>

        {/* 三层知识库状态 */}
        <div className="p-4 border-t border-slate-100">
          <div className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-3">
            知识库状态
          </div>
          <div className="space-y-2">
            <KbIndicator level="L1" name="原始文献库" color="slate" count={0} desc="只读·不可变" />
            <KbIndicator level="L2" name="结构化知识库" color="cyan" count={0} desc="主力调用层" />
            <KbIndicator level="L3" name="规则校验库" color="amber" count={0} desc="质检依据" />
          </div>
        </div>
      </div>
    </div>
  );
}

function KbIndicator({ level, name, color, count, desc }: {
  level: string;
  name: string;
  color: 'slate' | 'cyan' | 'amber';
  count: number;
  desc: string;
}) {
  const colorMap = {
    slate: 'bg-slate-600',
    cyan: 'bg-cyan-600',
    amber: 'bg-amber-600',
  };
  return (
    <div className="flex items-center gap-2 text-xs">
      <span className={cn('w-7 h-5 rounded text-white font-medium text-[10px] flex items-center justify-center', colorMap[color])}>
        {level}
      </span>
      <div className="flex-1">
        <div className="text-slate-700 font-medium">{name}</div>
        <div className="text-slate-400 text-[11px]">{desc}</div>
      </div>
      <span className="text-slate-500 font-mono">{count} 条</span>
    </div>
  );
}
