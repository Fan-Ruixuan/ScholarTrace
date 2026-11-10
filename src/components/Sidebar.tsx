'use client';

import { useState } from 'react';
import {
  MessageSquare,
  BookOpen,
  Database,
  FileText,
  Settings,
  Plus,
  Search,
  ChevronLeft,
  ChevronRight,
  FlaskConical,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface SidebarProps {
  conversations: Array<{
    id: string;
    title: string;
    updatedAt: number;
  }>;
  activeConversationId?: string;
  onNewChat: () => void;
  onSelectConversation: (id: string) => void;
}

type NavItem = {
  id: string;
  icon: React.ReactNode;
  label: string;
  badge?: string;
};

export function Sidebar({
  conversations,
  activeConversationId,
  onNewChat,
  onSelectConversation,
}: SidebarProps) {
  const [collapsed, setCollapsed] = useState(false);
  const [activeNav, setActiveNav] = useState('chat');
  const [searchQuery, setSearchQuery] = useState('');

  const navItems: NavItem[] = [
    { id: 'chat', icon: <MessageSquare className="w-5 h-5" />, label: '对话工作台' },
    { id: 'literature', icon: <BookOpen className="w-5 h-5" />, label: 'L1 原始文献库', badge: 'L1' },
    { id: 'knowledge', icon: <Database className="w-5 h-5" />, label: 'L2 结构化库', badge: 'L2' },
    { id: 'rules', icon: <FileText className="w-5 h-5" />, label: 'L3 规则库', badge: 'L3' },
    { id: 'experiments', icon: <FlaskConical className="w-5 h-5" />, label: '实验数据' },
    { id: 'settings', icon: <Settings className="w-5 h-5" />, label: '设置' },
  ];

  const filteredConversations = conversations.filter(c =>
    c.title.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  return (
    <div
      className={cn(
        'h-full bg-slate-900 text-slate-300 flex flex-col transition-all duration-200 relative',
        collapsed ? 'w-16' : 'w-[260px]',
      )}
    >
      {/* Logo区域 */}
      <div className="h-16 flex items-center px-4 border-b border-slate-800">
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center flex-shrink-0">
          <span className="text-white font-bold text-sm">溯</span>
        </div>
        {!collapsed && (
          <div className="ml-3 overflow-hidden">
            <h1 className="text-white font-semibold text-sm truncate">溯研</h1>
            <p className="text-xs text-slate-500 truncate">多智能体科研协作</p>
          </div>
        )}
      </div>

      {/* 新建对话按钮 */}
      <div className="p-3">
        <button
          onClick={onNewChat}
          className={cn(
            'w-full flex items-center gap-2 px-3 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium transition-colors',
            collapsed && 'justify-center px-2',
          )}
        >
          <Plus className="w-4 h-4 flex-shrink-0" />
          {!collapsed && <span>新建科研任务</span>}
        </button>
      </div>

      {/* 导航菜单 */}
      <nav className="px-2 space-y-0.5">
        {navItems.map(item => (
          <button
            key={item.id}
            onClick={() => setActiveNav(item.id)}
            className={cn(
              'w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors',
              activeNav === item.id
                ? 'bg-slate-800 text-white'
                : 'text-slate-400 hover:bg-slate-800/50 hover:text-slate-200',
              collapsed && 'justify-center px-2',
            )}
          >
            <span className="flex-shrink-0">{item.icon}</span>
            {!collapsed && (
              <>
                <span className="flex-1 text-left truncate">{item.label}</span>
                {item.badge && (
                  <span className="text-xs px-1.5 py-0.5 rounded bg-slate-700 text-slate-400">
                    {item.badge}
                  </span>
                )}
              </>
            )}
          </button>
        ))}
      </nav>

      {/* 历史对话列表 */}
      {!collapsed && (
        <div className="flex-1 overflow-hidden flex flex-col mt-4">
          <div className="px-4 mb-2">
            <h3 className="text-xs font-medium text-slate-500 uppercase tracking-wider">
              历史会话
            </h3>
          </div>

          {conversations.length > 0 && (
            <div className="px-3 mb-2">
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  placeholder="搜索会话..."
                  className="w-full pl-8 pr-3 py-1.5 text-sm bg-slate-800/50 border border-slate-700/50 rounded-md text-slate-300 placeholder-slate-500 focus:outline-none focus:border-slate-600"
                />
              </div>
            </div>
          )}

          <div className="flex-1 overflow-y-auto px-2 space-y-0.5">
            {filteredConversations.map(conv => (
              <button
                key={conv.id}
                onClick={() => onSelectConversation(conv.id)}
                className={cn(
                  'w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-left transition-colors',
                  activeConversationId === conv.id
                    ? 'bg-blue-600/20 text-blue-400 border border-blue-600/30'
                    : 'text-slate-400 hover:bg-slate-800/50 hover:text-slate-200',
                )}
              >
                <MessageSquare className="w-4 h-4 flex-shrink-0" />
                <span className="flex-1 truncate">{conv.title}</span>
              </button>
            ))}
            {filteredConversations.length === 0 && searchQuery && (
              <p className="text-xs text-slate-600 px-3 py-2">无匹配会话</p>
            )}
          </div>
        </div>
      )}

      {/* 用户信息 */}
      {!collapsed && (
        <div className="p-3 border-t border-slate-800">
          <div className="flex items-center gap-2 px-2 py-2">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center text-white text-xs font-medium">
              研
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm text-white truncate">科研工作者</p>
              <p className="text-xs text-slate-500 truncate">高校实验室</p>
            </div>
          </div>
        </div>
      )}

      {/* 折叠按钮 */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="absolute -right-3 top-20 w-6 h-6 rounded-full bg-slate-700 border border-slate-600 flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-600 transition-colors z-10"
      >
        {collapsed ? <ChevronRight className="w-3.5 h-3.5" /> : <ChevronLeft className="w-3.5 h-3.5" />}
      </button>
    </div>
  );
}
