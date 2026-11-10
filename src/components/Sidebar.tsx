'use client';

import {
  FileText,
  Database,
  BookOpen,
  Plus,
  Search,
  Settings,
  ChevronRight,
} from 'lucide-react';

type SidebarProps = {
  sessions: Array<{ id: string; title: string; time: string }>;
  activeSessionId: string | null;
  activeNav: string;
  onNewChat: () => void;
  onSelectSession: (id: string) => void;
  onSelectNav: (nav: string) => void;
};

export function Sidebar({
  sessions,
  activeSessionId,
  activeNav,
  onNewChat,
  onSelectSession,
  onSelectNav,
}: SidebarProps) {
  return (
    <aside className="sidebar">
      {/* Logo */}
      <div className="sidebar-logo">
        <div className="sidebar-logo-icon">溯</div>
        <span className="sidebar-logo-text">溯研</span>
      </div>

      {/* 新建对话 */}
      <button className="new-chat-btn" onClick={onNewChat}>
        <Plus />
        新建任务
      </button>

      {/* 主导航 */}
      <div className="sidebar-section">
        <div className="sidebar-section-title">工作台</div>
        <div
          className={`sidebar-nav-item ${activeNav === 'chat' ? 'active' : ''}`}
          onClick={() => onSelectNav('chat')}
        >
          <BookOpen size={16} />
          对话空间
        </div>
        <div
          className={`sidebar-nav-item ${activeNav === 'knowledge' ? 'active' : ''}`}
          onClick={() => onSelectNav('knowledge')}
        >
          <Database size={16} />
          知识库
          <span className="sidebar-badge">3</span>
        </div>
        <div
          className={`sidebar-nav-item ${activeNav === 'templates' ? 'active' : ''}`}
          onClick={() => onSelectNav('templates')}
        >
          <FileText size={16} />
          报告模板
        </div>
      </div>

      {/* 历史任务 */}
      <div className="sidebar-section" style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
        <div className="sidebar-section-title">最近任务</div>
        <div className="session-list">
          {sessions.length === 0 ? (
            <div style={{ padding: '16px 10px', fontSize: '12px', color: '#94a3b8' }}>
              暂无任务记录
            </div>
          ) : (
            sessions.map((s) => (
              <div
                key={s.id}
                className={`session-item ${activeSessionId === s.id ? 'active' : ''}`}
                onClick={() => onSelectSession(s.id)}
              >
                <div style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{s.title}</div>
                <div className="session-time">{s.time}</div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* 底部 */}
      <div className="sidebar-footer">
        <div className="user-avatar">研</div>
        <div className="user-info">
          <div className="user-name">科研工作者</div>
          <div className="user-role">高校实验室</div>
        </div>
        <Settings size={15} style={{ color: '#94a3b8', cursor: 'pointer' }} />
      </div>
    </aside>
  );
}
