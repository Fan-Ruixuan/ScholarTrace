'use client';

import { useState } from 'react';
import { Plus, Search, Database, Upload, MessageSquare, FolderOpen } from 'lucide-react';

interface SidebarProps {
  sessions: { id: string; title: string; active?: boolean }[];
  currentSession: string;
  onNewSession: () => void;
  onSelectSession: (id: string) => void;
  kbCounts: { l1: number; l2: number; l3: number };
}

export default function Sidebar({ sessions, currentSession, onNewSession, onSelectSession, kbCounts }: SidebarProps) {
  const [searchText, setSearchText] = useState('');

  const filteredSessions = sessions.filter(s =>
    s.title.toLowerCase().includes(searchText.toLowerCase())
  );

  return (
    <div className="sidebar">
      <div className="sidebar-section">
        <button className="new-task-btn" onClick={onNewSession}>
          <Plus size={15} />
          新建任务
        </button>
      </div>

      <div className="sidebar-section" style={{ paddingBottom: 12 }}>
        <div className="sidebar-title">知识库</div>
        <div className="kb-layer">
          <span className="kb-dot" style={{ background: 'var(--l1)' }} />
          L1 原始文献库
          <span className="kb-count">{kbCounts.l1}</span>
        </div>
        <div className="kb-layer">
          <span className="kb-dot" style={{ background: 'var(--l2)' }} />
          L2 结构化库
          <span className="kb-count">{kbCounts.l2}</span>
        </div>
        <div className="kb-layer">
          <span className="kb-dot" style={{ background: 'var(--l3)' }} />
          L3 规则校验库
          <span className="kb-count">{kbCounts.l3}</span>
        </div>
      </div>

      <div className="sidebar-section" style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: 0, borderBottom: 'none', overflow: 'hidden' }}>
        <div style={{ padding: '12px 14px 8px' }}>
          <div className="sidebar-title" style={{ marginBottom: 8 }}>历史任务</div>
          <div style={{ position: 'relative' }}>
            <Search size={12} style={{ position: 'absolute', left: 8, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-tertiary)' }} />
            <input
              type="text"
              placeholder="搜索..."
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              style={{
                width: '100%',
                padding: '5px 8px 5px 26px',
                border: '1px solid var(--border)',
                borderRadius: 5,
                background: 'var(--bg-primary)',
                fontSize: 12,
                outline: 'none',
                color: 'var(--text-primary)',
              }}
            />
          </div>
        </div>
        <div className="session-list">
          {filteredSessions.length === 0 && (
            <div style={{ textAlign: 'center', padding: 20, fontSize: 12, color: 'var(--text-tertiary)' }}>
              暂无历史任务
            </div>
          )}
          {filteredSessions.map((s) => (
            <div
              key={s.id}
              className={`session-item ${s.id === currentSession || s.active ? 'active' : ''}`}
              onClick={() => onSelectSession(s.id)}
            >
              {s.title}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
