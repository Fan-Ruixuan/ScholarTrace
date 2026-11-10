"use client";

import { useState } from "react";
import {
  Plus, Search, FileText, Database, BookOpen, Settings,
  ChevronRight, FolderOpen, Sparkles
} from "lucide-react";
import type { Session } from "@/lib/types";

interface SidebarProps {
  sessions: Session[];
  currentSessionId: string | null;
  onNewSession: () => void;
  onSelectSession: (id: string) => void;
  apiConnected: boolean;
}

const recentItems = [
  { icon: FolderOpen, label: "我的文献库", count: 12, color: "#845ef7" },
  { icon: Database, label: "结构化数据", count: 36, color: "#339af0" },
  { icon: BookOpen, label: "规范与模板", count: 8, color: "#f06595" },
];

export default function Sidebar({
  sessions, currentSessionId, onNewSession, onSelectSession, apiConnected
}: SidebarProps) {
  const [searchQuery, setSearchQuery] = useState("");

  const filteredSessions = sessions.filter(s =>
    s.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div
      className="flex flex-col h-full text-sm"
      style={{ background: "var(--bg-surface)", borderRight: "1px solid var(--border-subtle)" }}
    >
      {/* Logo */}
      <div className="px-4 py-4 flex items-center gap-2.5">
        <div
          className="w-7 h-7 rounded-lg flex items-center justify-center"
          style={{ background: "var(--brand)" }}
        >
          <Sparkles size={15} color="#fff" />
        </div>
        <div>
          <div style={{ color: "var(--text-primary)", fontWeight: 600, fontSize: "14px", lineHeight: 1.2 }}>
            溯研
          </div>
          <div style={{ color: "var(--text-tertiary)", fontSize: "11px", lineHeight: 1.2 }}>
            科研协作平台
          </div>
        </div>
      </div>

      {/* 新建任务 */}
      <div className="px-3 mb-3">
        <button
          onClick={onNewSession}
          className="btn-primary w-full justify-center"
        >
          <Plus size={15} />
          新建任务
        </button>
      </div>

      {/* 搜索 */}
      <div className="px-3 mb-3">
        <div className="relative">
          <Search
            size={13}
            className="absolute left-3 top-1/2 -translate-y-1/2"
            style={{ color: "var(--text-tertiary)" }}
          />
          <input
            type="text"
            placeholder="搜索历史"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="input-base w-full pl-8 py-2 text-sm"
          />
        </div>
      </div>

      {/* 知识库入口 */}
      <div className="px-3 mb-2">
        <div
          className="text-xs uppercase tracking-wider mb-2 px-1"
          style={{ color: "var(--text-tertiary)", fontSize: "11px", fontWeight: 500 }}
        >
          知识库
        </div>
        {recentItems.map(item => (
          <button
            key={item.label}
            className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg transition-colors"
            style={{ color: "var(--text-secondary)" }}
            onMouseEnter={e => {
              (e.currentTarget as HTMLElement).style.background = "var(--bg-glass)";
              (e.currentTarget as HTMLElement).style.color = "var(--text-primary)";
            }}
            onMouseLeave={e => {
              (e.currentTarget as HTMLElement).style.background = "transparent";
              (e.currentTarget as HTMLElement).style.color = "var(--text-secondary)";
            }}
          >
            <item.icon size={14} style={{ color: item.color }} />
            <span className="flex-1 text-left text-sm">{item.label}</span>
            <span style={{ color: "var(--text-tertiary)", fontSize: "11px" }}>{item.count}</span>
          </button>
        ))}
      </div>

      {/* 历史会话 */}
      <div className="flex-1 overflow-y-auto px-3">
        <div
          className="text-xs uppercase tracking-wider mb-2 px-1 mt-3"
          style={{ color: "var(--text-tertiary)", fontSize: "11px", fontWeight: 500 }}
        >
          最近任务
        </div>
        {filteredSessions.length === 0 && (
          <div
            className="px-2 py-3 text-xs text-center"
            style={{ color: "var(--text-tertiary)" }}
          >
            暂无历史任务
          </div>
        )}
        {filteredSessions.map(session => {
          const isActive = session.id === currentSessionId;
          return (
            <button
              key={session.id}
              onClick={() => onSelectSession(session.id)}
              className="w-full flex items-start gap-2 px-2.5 py-2.5 rounded-lg mb-0.5 transition-colors text-left"
              style={{
                background: isActive ? "var(--brand-light)" : "transparent",
                color: isActive ? "var(--brand)" : "var(--text-secondary)"
              }}
              onMouseEnter={e => {
                if (!isActive) (e.currentTarget as HTMLElement).style.background = "var(--bg-glass)";
              }}
              onMouseLeave={e => {
                if (!isActive) (e.currentTarget as HTMLElement).style.background = "transparent";
              }}
            >
              <FileText size={14} className="mt-0.5 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="text-sm truncate" style={{ fontWeight: isActive ? 500 : 400 }}>
                  {session.title}
                </div>
                <div style={{ fontSize: "11px", color: isActive ? "var(--brand)" : "var(--text-tertiary)", opacity: 0.8 }}>
                  {session.timestamp}
                </div>
              </div>
              {isActive && <ChevronRight size={14} className="mt-0.5 flex-shrink-0" />}
            </button>
          );
        })}
      </div>

      {/* 底部 */}
      <div
        className="px-3 py-3 mt-auto"
        style={{ borderTop: "1px solid var(--border-subtle)" }}
      >
        <div className="flex items-center gap-2 px-2.5 py-2">
          <div className="relative">
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium"
              style={{ background: "var(--brand-light)", color: "var(--brand)" }}
            >
              研
            </div>
            <div
              className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2"
              style={{
                background: apiConnected ? "var(--success)" : "var(--warning)",
                borderColor: "var(--bg-surface)"
              }}
            />
          </div>
          <div className="flex-1 min-w-0">
            <div style={{ fontSize: "13px", color: "var(--text-primary)", fontWeight: 500 }}>科研工作者</div>
            <div style={{ fontSize: "11px", color: "var(--text-tertiary)" }}>
              {apiConnected ? "API 已连接" : "演示模式"}
            </div>
          </div>
          <button
            className="p-1.5 rounded-md transition-colors"
            style={{ color: "var(--text-tertiary)" }}
          >
            <Settings size={15} />
          </button>
        </div>
      </div>
    </div>
  );
}
