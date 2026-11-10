'use client';

import { useState } from 'react';
import { Plus, Search, FileText, Database, BookOpen, Shield, FolderOpen, ChevronDown, Sparkles, History } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Conversation {
  id: string;
  title: string;
  updatedAt: number;
}

interface SidebarProps {
  conversations: Conversation[];
  activeId: string;
  onSelect: (id: string) => void;
  onNewChat: () => void;
}

export function Sidebar({ conversations, activeId, onSelect, onNewChat }: SidebarProps) {
  const [kbExpanded, setKbExpanded] = useState(true);

  return (
    <aside className="w-[260px] flex-shrink-0 border-r border-slate-800/50 bg-slate-950/80 backdrop-blur-xl flex flex-col">
      {/* Logo 区域 */}
      <div className="p-4 border-b border-slate-800/50">
        <button
          onClick={onNewChat}
          className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-sm font-medium shadow-lg shadow-blue-500/20 transition-all hover:shadow-blue-500/30 hover:scale-[1.02] active:scale-[0.98]"
        >
          <Plus className="w-4 h-4" />
          新建科研任务
        </button>
      </div>

      {/* 三层知识库导航 */}
      <div className="px-3 py-3 border-b border-slate-800/50">
        <button
          onClick={() => setKbExpanded(!kbExpanded)}
          className="flex items-center gap-2 w-full text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 hover:text-slate-300 transition-colors"
        >
          <FolderOpen className="w-3.5 h-3.5" />
          知识库
          <ChevronDown className={cn('w-3.5 h-3.5 ml-auto transition-transform', kbExpanded ? '' : '-rotate-90')} />
        </button>

        {kbExpanded && (
          <div className="space-y-1">
            <KBItem
              icon={<FileText className="w-3.5 h-3.5" />}
              color="text-slate-300"
              bgColor="bg-slate-700/40"
              label="L1 原始文献库"
              desc="PDF原文·只读底账"
              docCount={12}
            />
            <KBItem
              icon={<Database className="w-3.5 h-3.5" />}
              color="text-cyan-300"
              bgColor="bg-cyan-500/10"
              label="L2 结构化库"
              desc="摘要·参数·指标"
              docCount={48}
            />
            <KBItem
              icon={<Shield className="w-3.5 h-3.5" />}
              color="text-amber-300"
              bgColor="bg-amber-500/10"
              label="L3 规则校验库"
              desc="规范·模板·错误范式"
              docCount={8}
            />
          </div>
        )}
      </div>

      {/* 历史会话 */}
      <div className="flex-1 overflow-y-auto custom-scrollbar px-3 py-3">
        <div className="flex items-center gap-2 text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 px-1">
          <History className="w-3.5 h-3.5" />
          历史任务
        </div>

        <div className="relative mb-3">
          <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            placeholder="搜索任务..."
            className="w-full pl-8 pr-3 py-1.5 bg-slate-800/40 border border-slate-700/50 rounded-lg text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-blue-500/50 focus:bg-slate-800/70 transition-all"
          />
        </div>

        <div className="space-y-0.5">
          {conversations.map((conv) => (
            <button
              key={conv.id}
              onClick={() => onSelect(conv.id)}
              className={cn(
                'w-full text-left px-3 py-2 rounded-lg text-sm transition-all',
                activeId === conv.id
                  ? 'bg-blue-600/20 text-blue-200 border border-blue-500/30'
                  : 'text-slate-400 hover:bg-slate-800/50 hover:text-slate-200 border border-transparent'
              )}
            >
              <div className="flex items-center gap-2">
                <BookOpen className="w-3.5 h-3.5 flex-shrink-0" />
                <span className="truncate font-medium">{conv.title}</span>
              </div>
              <div className="text-[10px] text-slate-500 mt-0.5 ml-5.5 pl-0.5">
                {new Date(conv.updatedAt).toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' })}
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* 底部：版本信息 */}
      <div className="p-3 border-t border-slate-800/50">
        <div className="flex items-center gap-2 px-2 py-1.5 rounded-lg bg-slate-800/30">
          <div className="w-7 h-7 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center flex-shrink-0">
            <Sparkles className="w-3.5 h-3.5 text-white" />
          </div>
          <div className="min-w-0">
            <div className="text-xs font-medium text-slate-200 truncate">溯研 Suyan v1.0</div>
            <div className="text-[10px] text-slate-500">多智能体·可溯源·防幻觉</div>
          </div>
        </div>
      </div>
    </aside>
  );
}

function KBItem({
  icon, color, bgColor, label, desc, docCount,
}: {
  icon: React.ReactNode;
  color: string;
  bgColor: string;
  label: string;
  desc: string;
  docCount: number;
}) {
  return (
    <button className="w-full flex items-center gap-2.5 px-2 py-2 rounded-lg hover:bg-slate-800/50 transition-colors group">
      <div className={cn('w-7 h-7 rounded-md flex items-center justify-center flex-shrink-0', bgColor, color)}>
        {icon}
      </div>
      <div className="flex-1 min-w-0 text-left">
        <div className={cn('text-xs font-medium', color)}>{label}</div>
        <div className="text-[10px] text-slate-500 truncate">{desc}</div>
      </div>
      <span className="text-[10px] text-slate-500 font-mono">{docCount}</span>
    </button>
  );
}
