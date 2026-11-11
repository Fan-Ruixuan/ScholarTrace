'use client';

import { useState, useRef, useEffect } from 'react';
import {
  Plus, Search, Database, FolderOpen, ChevronDown, ChevronRight,
  Pencil, Trash2, X, Check, MoreHorizontal, BookOpen, Clock, ShieldCheck
} from 'lucide-react';
import type { Session, SessionGroup, TimelineEvent } from '@/lib/types';
import { KB_ENTRIES, KB_LAYER_META, type KBEntry, type KBLayer } from '@/lib/knowledge-base';

interface SidebarProps {
  groups: SessionGroup[];
  sessions: Session[];
  currentSession: string;
  onNewSession: (groupId?: string) => void;
  onSelectSession: (id: string) => void;
  onRenameSession: (id: string, title: string) => void;
  onDeleteSession: (id: string) => void;
  onToggleGroup: (id: string) => void;
  onAddGroup: (name: string) => void;
  onRenameGroup: (id: string, name: string) => void;
  onDeleteGroup: (id: string) => void;
  kbCounts: { l1: number; l2: number; l3: number };
  kbDrawer: 'L1' | 'L2' | 'L3' | null;
  onKbDrawer: (layer: 'L1' | 'L2' | 'L3' | null) => void;
  timelineEvents: TimelineEvent[];
}

/* ======== 知识库详情抽屉：图层说明 + 可展开条目 + 访问记录 ======== */

function KBEntryRow({
  entry,
  expanded,
  onToggle,
}: {
  entry: KBEntry;
  expanded: boolean;
  onToggle: () => void;
}) {
  return (
    <div className={`kb-entry ${expanded ? 'expanded' : ''}`}>
      <div className="kb-entry-header" onClick={onToggle}>
        <div className="kb-entry-main">
          <div className="kb-entry-line">
            <span className="kb-entry-id">{entry.id}</span>
            {entry.tag && <span className="kb-entry-tag">{entry.tag}</span>}
          </div>
          <div className="kb-entry-title">{entry.title}</div>
          <div className="kb-entry-meta">{entry.meta}</div>
        </div>
        <span className="kb-entry-caret">
          {expanded ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
        </span>
      </div>
      {expanded && (
        <div className="kb-entry-body">
          <div className="kb-entry-excerpt">{entry.excerpt}</div>
          {entry.fields && entry.fields.length > 0 && (
            <div className="kb-entry-fields">
              {entry.fields.map(f => (
                <div className="kb-entry-field" key={f.label}>
                  <span className="kb-entry-field-label">{f.label}</span>
                  <span className="kb-entry-field-value">{f.value}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function KBDrawer({
  layer,
  events,
  counts,
  onClose,
}: {
  layer: KBLayer;
  events: TimelineEvent[];
  counts: { l1: number; l2: number; l3: number };
  onClose: () => void;
}) {
  const colorVar = layer === 'L1' ? 'var(--l1)' : layer === 'L2' ? 'var(--l2)' : 'var(--l3)';
  const meta = KB_LAYER_META[layer];
  const countKey = layer.toLowerCase() as 'l1' | 'l2' | 'l3';

  const [tab, setTab] = useState<'content' | 'access'>('content');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Esc 关闭抽屉
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  // 本次运行写入 L2 的 record_id（去重，且不与存量条目重复）
  const liveEntries: KBEntry[] = layer === 'L2'
    ? Array.from(new Set(
        events
          .filter(e => e.kind === 'flow.pointer')
          .map(e => (e as Extract<TimelineEvent, { kind: 'flow.pointer' }>).recordId)
      ))
        .filter(id => !KB_ENTRIES.L2.some(x => x.id === id))
        .map(id => ({
          id,
          title: '本次运行写入的结构化记录',
          meta: 'record_id 指针 · 运行期写入',
          tag: '本次运行',
          excerpt: '该记录由本次工作流产生，已通过 record_id 指针在 Agent 之间传递，可作为报告结论的溯源依据。',
          fields: [
            { label: '写入者', value: '解析 / 数据处理 Agent' },
            { label: '调用方式', value: 'ID 进 ID 出，不传长文本' },
          ],
        }))
    : [];

  const entries = [...liveEntries, ...KB_ENTRIES[layer]];
  const accessEvents = events
    .filter(e => e.kind === 'kb.access' && e.layer === layer)
    .slice(-30);

  return (
    <div className="kb-drawer" onClick={onClose}>
      <div className="kb-drawer-panel" onClick={e => e.stopPropagation()} role="dialog" aria-label={meta.fullName}>
        <div className="kb-drawer-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
            <span className="kb-dot" style={{ background: colorVar, width: 10, height: 10 }} />
            <span className="kb-drawer-title">{meta.fullName}</span>
            <span className="kb-drawer-badge">{entries.length} 项</span>
          </div>
          <button className="kb-drawer-close" onClick={onClose} title="关闭 (Esc)"><X size={14} /></button>
        </div>

        {/* 图层说明 */}
        <div className="kb-meta">
          <div className="kb-meta-row">
            <span className="kb-meta-label">定位</span>
            <span className="kb-meta-value">{meta.purpose}</span>
          </div>
          <div className="kb-meta-row">
            <span className="kb-meta-label">读写</span>
            <span className="kb-meta-value">{meta.policy}</span>
          </div>
          <div className="kb-meta-row">
            <span className="kb-meta-label">格式</span>
            <span className="kb-meta-value">{meta.format}</span>
          </div>
        </div>

        {/* 页签 */}
        <div className="kb-tabs">
          <button
            className={`kb-tab ${tab === 'content' ? 'active' : ''}`}
            onClick={() => setTab('content')}
          >
            <BookOpen size={12} />
            库内容
            <span className="kb-tab-count">{entries.length}</span>
          </button>
          <button
            className={`kb-tab ${tab === 'access' ? 'active' : ''}`}
            onClick={() => setTab('access')}
          >
            <Clock size={12} />
            访问记录
            <span className="kb-tab-count">{counts[countKey]}</span>
          </button>
        </div>

        <div className="kb-drawer-body">
          {tab === 'content' ? (
            entries.map(entry => (
              <KBEntryRow
                key={entry.id}
                entry={entry}
                expanded={expandedId === entry.id}
                onToggle={() => setExpandedId(expandedId === entry.id ? null : entry.id)}
              />
            ))
          ) : accessEvents.length === 0 ? (
            <div className="kb-drawer-empty">
              <Database size={32} opacity={0.3} />
              暂无访问记录
              <div style={{ fontSize: 11, marginTop: 6, opacity: 0.5 }}>
                执行工作流后会显示数据读写历史
              </div>
            </div>
          ) : (
            accessEvents.map((e, i) => {
              const ev = e as Extract<TimelineEvent, { kind: 'kb.access' }>;
              const timeStr = new Date(ev.ts).toLocaleTimeString('zh-CN', { hour12: false });
              return (
                <div key={i} className="kb-drawer-item">
                  <span
                    className="kb-drawer-action"
                    style={{ color: ev.action === 'read' ? 'var(--brand)' : 'var(--success)' }}
                  >
                    {ev.action === 'read' ? '读取' : '写入'}
                  </span>
                  <span className="kb-drawer-detail">{ev.detail}</span>
                  <span className="kb-drawer-time">{timeStr}</span>
                </div>
              );
            })
          )}
        </div>

        <div className="kb-drawer-footer">
          <ShieldCheck size={11} style={{ display: 'inline', verticalAlign: -2, marginRight: 5 }} />
          {layer === 'L1' && '只读底账 · 结论可回溯到原文页码'}
          {layer === 'L2' && '主力调用层 · 所有 Agent 通过 record_id 读取'}
          {layer === 'L3' && '质检依据 · 硬性格式校验 + 软性语义比对'}
        </div>
      </div>
    </div>
  );
}

/* ======== 单条会话项：hover 出现操作按钮，双击重命名 ======== */

function SessionItem({
  session,
  active,
  onSelect,
  onRename,
  onDelete,
}: {
  session: Session;
  active: boolean;
  onSelect: () => void;
  onRename: (newTitle: string) => void;
  onDelete: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(session.title);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editing) inputRef.current?.focus();
  }, [editing]);

  const submit = () => {
    const v = value.trim();
    if (v && v !== session.title) onRename(v);
    else setValue(session.title);
    setEditing(false);
  };

  return (
    <div
      className={`session-item ${active ? 'active' : ''}`}
      onClick={!editing ? onSelect : undefined}
      onDoubleClick={() => setEditing(true)}
    >
      {editing ? (
        <div className="session-edit-row" onClick={e => e.stopPropagation()}>
          <input
            ref={inputRef}
            className="session-edit-input"
            value={value}
            onChange={e => setValue(e.target.value)}
            onBlur={submit}
            onKeyDown={e => { if (e.key === 'Enter') submit(); if (e.key === 'Escape') { setValue(session.title); setEditing(false); } }}
          />
          <button className="session-edit-btn" onClick={submit} title="保存"><Check size={11} /></button>
          <button className="session-edit-btn" onClick={() => { setValue(session.title); setEditing(false); }} title="取消"><X size={11} /></button>
        </div>
      ) : (
        <>
          <FolderOpen size={12} style={{ flexShrink: 0, opacity: 0.5 }} />
          <span className="session-item-title">{session.title}</span>
          <div className="session-item-actions">
            <button
              className="session-action-btn"
              title="重命名"
              onClick={e => { e.stopPropagation(); setEditing(true); }}
            >
              <Pencil size={11} />
            </button>
            <button
              className="session-action-btn danger"
              title="删除"
              onClick={e => { e.stopPropagation(); onDelete(); }}
            >
              <Trash2 size={11} />
            </button>
          </div>
        </>
      )}
    </div>
  );
}

/* ======== 分组标题：折叠/展开 + 新建会话 + 重命名/删除 ======== */

function GroupHeader({
  group,
  sessionCount,
  collapsed,
  onToggle,
  onAddSession,
  onRename,
  onDelete,
}: {
  group: SessionGroup;
  sessionCount: number;
  collapsed: boolean;
  onToggle: () => void;
  onAddSession: () => void;
  onRename: (name: string) => void;
  onDelete: () => void;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(group.name);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { if (editing) inputRef.current?.focus(); }, [editing]);

  const submit = () => {
    const v = value.trim();
    if (v && v !== group.name) onRename(v);
    else setValue(group.name);
    setEditing(false);
  };

  return (
    <div className="group-header">
      {editing ? (
        <input
          ref={inputRef}
          className="group-edit-input"
          value={value}
          onChange={e => setValue(e.target.value)}
          onBlur={submit}
          onKeyDown={e => { if (e.key === 'Enter') submit(); if (e.key === 'Escape') { setValue(group.name); setEditing(false); } }}
          onClick={e => e.stopPropagation()}
        />
      ) : (
        <div className="group-header-left" onClick={onToggle}>
          {collapsed ? <ChevronRight size={12} /> : <ChevronDown size={12} />}
          <span className="group-color-dot" style={{ background: group.color || 'var(--text-tertiary)' }} />
          <span className="group-name">{group.name}</span>
          <span className="group-count">{sessionCount}</span>
        </div>
      )}
      {!editing && (
        <div className="group-header-right">
          <button className="group-action-btn" title="新建任务在此分组" onClick={e => { e.stopPropagation(); onAddSession(); }}>
            <Plus size={11} />
          </button>
          <div className="group-more-wrapper" onClick={e => e.stopPropagation()}>
            <button className="group-action-btn" onClick={() => setMenuOpen(!menuOpen)}>
              <MoreHorizontal size={11} />
            </button>
            {menuOpen && (
              <div className="group-more-menu">
                <div onClick={() => { setEditing(true); setMenuOpen(false); }}>重命名分组</div>
                {group.id !== 'g-default' && (
                  <div className="danger" onClick={() => { if (confirm(`删除分组「${group.name}」？分组下的会话将移到"未分组"。`)) { onDelete(); } setMenuOpen(false); }}>
                    删除分组
                  </div>
                )}
              </div>
            )}
            {menuOpen && <div className="group-more-backdrop" onClick={() => setMenuOpen(false)} />}
          </div>
        </div>
      )}
    </div>
  );
}

/* ======== 主组件 Sidebar ======== */

export default function Sidebar({
  groups,
  sessions,
  currentSession,
  onNewSession,
  onSelectSession,
  onRenameSession,
  onDeleteSession,
  onToggleGroup,
  onAddGroup,
  onRenameGroup,
  onDeleteGroup,
  kbCounts,
  kbDrawer,
  onKbDrawer,
  timelineEvents,
}: SidebarProps) {
  const [searchText, setSearchText] = useState('');
  const [showAddGroup, setShowAddGroup] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');

  const filteredSessions = sessions.filter(s =>
    s.title.toLowerCase().includes(searchText.toLowerCase())
  );

  // 按分组聚合
  const sessionsByGroup: Record<string, Session[]> = {};
  for (const g of groups) sessionsByGroup[g.id] = [];
  for (const s of filteredSessions) {
    const gid = sessionsByGroup[s.groupId] ? s.groupId : 'g-default';
    sessionsByGroup[gid] = sessionsByGroup[gid] || [];
    sessionsByGroup[gid].push(s);
  }

  return (
    <>
      <div className="sidebar">
        {/* 顶部：新建任务大按钮 */}
        <div className="sidebar-section">
          <button className="new-task-btn" onClick={() => onNewSession()}>
            <Plus size={15} />
            新建任务
          </button>
        </div>

        {/* 三层知识库入口 */}
        <div className="sidebar-section" style={{ paddingBottom: 12 }}>
          <div className="sidebar-title">知识库</div>
          {(['L1', 'L2', 'L3'] as const).map(layer => {
            const colorVar = layer === 'L1' ? 'var(--l1)' : layer === 'L2' ? 'var(--l2)' : 'var(--l3)';
            const label = layer === 'L1' ? '原始文献库' : layer === 'L2' ? '结构化库' : '规则校验库';
            const countKey = layer.toLowerCase() as 'l1' | 'l2' | 'l3';
            const active = kbDrawer === layer;
            return (
              <div
                key={layer}
                className={`kb-layer ${active ? 'active' : ''}`}
                onClick={() => onKbDrawer(active ? null : layer)}
                title={`查看${label}详情`}
              >
                <span className="kb-dot" style={{ background: colorVar }} />
                <span className="kb-layer-label">{label}</span>
                <span className="kb-count">{kbCounts[countKey]}</span>
                <ChevronRight size={12} className="kb-layer-caret" />
              </div>
            );
          })}
        </div>

        {/* 会话分组列表 */}
        <div className="sidebar-section sidebar-session-section">
          <div className="sidebar-search-wrap">
            <Search size={12} className="sidebar-search-icon" />
            <input
              className="sidebar-search-input"
              placeholder="搜索任务..."
              value={searchText}
              onChange={e => setSearchText(e.target.value)}
            />
          </div>

          <div className="sidebar-groups">
            {groups.map(g => {
              const groupSessions = (sessionsByGroup[g.id] || []).sort((a, b) => b.createdAt - a.createdAt);
              if (searchText && groupSessions.length === 0) return null;
              return (
                <div key={g.id} className="sidebar-group">
                  <GroupHeader
                    group={g}
                    sessionCount={groupSessions.length}
                    collapsed={g.collapsed}
                    onToggle={() => onToggleGroup(g.id)}
                    onAddSession={() => onNewSession(g.id)}
                    onRename={name => onRenameGroup(g.id, name)}
                    onDelete={() => onDeleteGroup(g.id)}
                  />
                  {!g.collapsed && (
                    <div className="sidebar-group-sessions">
                      {groupSessions.length === 0 ? (
                        <div className="sidebar-empty-group">
                          暂无任务
                          <button onClick={() => onNewSession(g.id)} className="sidebar-empty-add">
                            <Plus size={10} />
                            新建
                          </button>
                        </div>
                      ) : groupSessions.map(s => (
                        <SessionItem
                          key={s.id}
                          session={s}
                          active={s.id === currentSession}
                          onSelect={() => onSelectSession(s.id)}
                          onRename={title => onRenameSession(s.id, title)}
                          onDelete={() => { if (confirm(`删除「${s.title}」？`)) onDeleteSession(s.id); }}
                        />
                      ))}
                    </div>
                  )}
                </div>
              );
            })}

            {/* 新建分组 */}
            {showAddGroup ? (
              <div className="add-group-form">
                <input
                  className="add-group-input"
                  placeholder="课题方向名称..."
                  value={newGroupName}
                  onChange={e => setNewGroupName(e.target.value)}
                  autoFocus
                  onKeyDown={e => {
                    if (e.key === 'Enter') {
                      const v = newGroupName.trim();
                      if (v) { onAddGroup(v); setNewGroupName(''); }
                      setShowAddGroup(false);
                    }
                    if (e.key === 'Escape') { setShowAddGroup(false); setNewGroupName(''); }
                  }}
                />
                <button className="add-group-submit" onClick={() => {
                  const v = newGroupName.trim();
                  if (v) { onAddGroup(v); setNewGroupName(''); }
                  setShowAddGroup(false);
                }}><Check size={11} /></button>
              </div>
            ) : (
              <button className="add-group-btn" onClick={() => setShowAddGroup(true)}>
                <Plus size={11} />
                新建课题分组
              </button>
            )}
          </div>
        </div>

        {/* 底部工作区概览 */}
        <div className="sidebar-footer">
          <div className="sidebar-footer-title">工作区概览</div>
          <div className="sidebar-footer-stats">
            <div className="sidebar-footer-stat">
              <span className="sidebar-footer-num">{sessions.length}</span>
              <span className="sidebar-footer-label">任务</span>
            </div>
            <div className="sidebar-footer-stat">
              <span className="sidebar-footer-num">{groups.length}</span>
              <span className="sidebar-footer-label">课题</span>
            </div>
            <div className="sidebar-footer-stat">
              <span className="sidebar-footer-num">{kbCounts.l1 + kbCounts.l2 + kbCounts.l3}</span>
              <span className="sidebar-footer-label">知识库调用</span>
            </div>
          </div>
          <div className="sidebar-footer-hint">全链路可溯源 · 引用可回溯原文</div>
        </div>
      </div>

      {/* 知识库抽屉（右侧弹出） */}
      {kbDrawer && (
        <KBDrawer
          layer={kbDrawer}
          events={timelineEvents}
          counts={kbCounts}
          onClose={() => onKbDrawer(null)}
        />
      )}
    </>
  );
}
