'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { User, Bot, FileText, AlertTriangle, CheckCircle2, XCircle, X, ChevronDown, ChevronRight, Search, ClipboardCopy, ArrowUpRight } from 'lucide-react';
import type { Message, Citation, WorkflowResult } from '@/lib/types';
import { AGENT_CONFIGS } from '@/lib/agent-config';

interface MessageListProps {
  messages: Message[];
  isStreaming: boolean;
  streamingContent: string;
  onCitationClick: (citationId: string | null) => void;
  activeCitation: string | null;
  citationMap: Map<string, Citation>;
  onCopyReport?: (content: string) => void;
  onQuickStart?: (prompt: string) => void;
}

function AgentAvatar({ agent = 'orchestrator' }: { agent?: string }) {
  return (
    <div className="message-avatar agent">
      <Bot size={14} />
    </div>
  );
}

function UserAvatar() {
  return (
    <div className="message-avatar user">
      <User size={14} />
    </div>
  );
}

// 引用标记渲染
function CitationMark({
  index,
  citationId,
  isActive,
  onClick,
}: {
  index: number;
  citationId: string;
  isActive: boolean;
  onClick: (citationId: string, event: React.MouseEvent) => void;
}) {
  return (
    <span
      className={`citation-mark ${isActive ? 'active' : ''}`}
      onClick={(e) => {
        e.stopPropagation?.();
        onClick(citationId, e);
      }}
      title={`查看来源 [${index}]`}
    >
      [{index}]
    </span>
  );
}

// 显微镜溯源浮窗
function CitationPopup({
  citation,
  position,
  onClose,
}: {
  citation: Citation;
  position: { top: number; left: number };
  onClose: () => void;
}) {
  const popupRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (popupRef.current && !popupRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [onClose]);

  return (
    <div
      ref={popupRef}
      className="citation-popup"
      style={{ top: position.top, left: position.left }}
    >
      <div className="citation-popup-header">
        <div className="citation-popup-title">
          <Search size={12} color="var(--brand)" />
          来源溯源 · [{citation.index}]
        </div>
        <button className="citation-popup-close" onClick={onClose}>
          <X size={14} />
        </button>
      </div>
      <div className="citation-section">
        <div className="citation-section-label">
          <ClipboardCopy size={10} style={{ display: 'inline', verticalAlign: -1, marginRight: 4 }} />
          原始片段
        </div>
        <div className="citation-section-content">
          {citation.snippet || `文献 ${citation.docId} 第 ${citation.page} 页原始内容片段`}
        </div>
      </div>
      <div className="citation-section">
        <div className="citation-section-label">
          <FileText size={10} style={{ display: 'inline', verticalAlign: -1, marginRight: 4 }} />
          结构化摘要
        </div>
        <div className="citation-section-content summary">
          {citation.snippet ? `解析自文献 ${citation.docId}，第 ${citation.page} 页，已写入L2结构化知识库` : `record_id: ${citation.docId}-p${citation.page}`}
        </div>
      </div>
    </div>
  );
}

// 异常/结果卡片
function ResultCards({ result }: { result: WorkflowResult }) {
  if (result.type === 'data') {
    const exceptionList: string[] = result.data.exceptionList || [];
    return (
      <div className="result-card warning">
        <div className="result-card-title" style={{ color: 'var(--warning)' }}>
          <AlertTriangle size={13} />
          数据清洗完成 · {exceptionList.length} 处异常已标注
        </div>
        {exceptionList.length > 0 && exceptionList.length <= 5 && (
          <ul className="result-card-list">
            {exceptionList.slice(0, 5).map((e, i) => <li key={i}>{e}</li>)}
          </ul>
        )}
        {exceptionList.length > 5 && (
          <ul className="result-card-list">
            {exceptionList.slice(0, 3).map((e, i) => <li key={i}>{e}</li>)}
            <li>... 等 {exceptionList.length} 处异常</li>
          </ul>
        )}
        {result.data.recordId && (
          <div style={{ marginTop: 6, fontSize: 11, color: 'var(--text-tertiary)', fontFamily: 'JetBrains Mono, monospace' }}>
            record_id: {result.data.recordId}
          </div>
        )}
      </div>
    );
  }

  if (result.type === 'check') {
    const passed = result.data.passed;
    return (
      <div className={`result-card ${passed ? 'success' : 'error'}`}>
        <div className="result-card-title" style={{ color: passed ? 'var(--success)' : 'var(--error)' }}>
          {passed ? <CheckCircle2 size={13} /> : <XCircle size={13} />}
          合规校验 · {passed ? '通过' : '未通过'}
          {!passed && result.data.issueList && ` · ${result.data.issueList.length} 处问题`}
        </div>
        {result.data.issueList && result.data.issueList.length > 0 && (
          <ul className="result-card-list">
            {result.data.issueList.slice(0, 3).map((issue, i) => <li key={i}>{issue}</li>)}
          </ul>
        )}
        {result.data.retryCount !== undefined && result.data.retryCount > 0 && (
          <div style={{ marginTop: 6, fontSize: 11, color: 'var(--text-tertiary)' }}>
            已重试 {result.data.retryCount} 次
          </div>
        )}
      </div>
    );
  }

  if (result.type === 'report') {
    return (
      <div className="result-card success">
        <div className="result-card-title" style={{ color: 'var(--success)' }}>
          <FileText size={13} />
          报告已生成
          {result.data.reportId && (
            <span style={{ marginLeft: 'auto', fontSize: 11, color: 'var(--text-tertiary)', fontFamily: 'JetBrains Mono, monospace', fontWeight: 400 }}>
              {result.data.reportId}
            </span>
          )}
        </div>
      </div>
    );
  }

  if (result.type === 'parse') {
    return (
      <div className="result-card success">
        <div className="result-card-title" style={{ color: 'var(--success)' }}>
          <CheckCircle2 size={13} />
          文献解析完成
          {result.data.recordIdList && (
            <span style={{ marginLeft: 'auto', fontSize: 11, color: 'var(--text-tertiary)', fontFamily: 'JetBrains Mono, monospace', fontWeight: 400 }}>
              {result.data.recordIdList.length} 条记录
            </span>
          )}
        </div>
      </div>
    );
  }

  return null;
}

export default function MessageList({
  messages,
  isStreaming,
  streamingContent,
  onCitationClick,
  activeCitation,
  citationMap,
  onCopyReport,
  onQuickStart,
}: MessageListProps) {
  const [popupData, setPopupData] = useState<{ citation: Citation; position: { top: number; left: number } } | null>(null);
  const [expandedRefs, setExpandedRefs] = useState<Set<string>>(new Set());

  const handleCitationClick = useCallback((citationId: string, event: React.MouseEvent) => {
    if (activeCitation === citationId) {
      setPopupData(null);
      onCitationClick(null);
      return;
    }
    const citation = citationMap.get(citationId);
    if (!citation) return;
    const rect = (event.target as HTMLElement).getBoundingClientRect();
    const containerRect = (event.target as HTMLElement).closest('.messages-scroll')?.getBoundingClientRect();
    const top = rect.bottom - (containerRect?.top || 0) + 6;
    let left = rect.left - (containerRect?.left || 0) - 130;
    left = Math.max(10, Math.min(left, (containerRect?.width || 600) - 310));
    setPopupData({ citation, position: { top, left } });
    onCitationClick(citationId);
  }, [activeCitation, citationMap, onCitationClick]);

  const closePopup = useCallback(() => {
    setPopupData(null);
    onCitationClick(null);
  }, [onCitationClick]);

  useEffect(() => {
    if (!activeCitation) {
      setPopupData(null);
    }
  }, [activeCitation]);

  // 渲染Markdown + 引用标记：按引用模式切片，交替渲染
  const renderContentWithCitations = (content: string, msgId: string) => {
    // Step 1: 收集所有【来源:...】引用并替换为 %%CIT:n%% 占位符
    const sourceRegex = /【来源:\s*(?:doc_id|文献ID)\s*=\s*([^,，\s】]+)[,，\s]*page[=:\s]*(\d+)】/g;
    const bracketRegex = /\[(\d+)\]/g;

    const msgCitations: Citation[] = [];
    const usedIds = new Set<string>();
    let citationIdx = 0;

    let processed = content;
    let sm;
    while ((sm = sourceRegex.exec(content)) !== null) {
      const docId = sm[1], page = sm[2];
      const citId = `${msgId}-${docId}-${page}`;
      if (usedIds.has(citId)) continue;
      usedIds.add(citId);
      citationIdx++;
      msgCitations.push({ id: citId, index: citationIdx, docId, page, snippet: '' });
      processed = processed.replace(sm[0], `%%CIT:${citationIdx}%%`);
    }
    // 如果内容里已有 [n] 格式（模拟返回），也收集
    let bm;
    while ((bm = bracketRegex.exec(content)) !== null) {
      const num = parseInt(bm[1]);
      if (num > msgCitations.length) {
        // 补一个空的（模拟数据）
        const citId = `${msgId}-bracket-${num}`;
        if (!usedIds.has(citId)) {
          usedIds.add(citId);
          msgCitations.push({ id: citId, index: num, docId: `模拟文献${num}`, page: '—', snippet: '' });
        }
      }
    }
    // 把残留的 [n] 也换成 %%CIT:n%%
    processed = processed.replace(bracketRegex, (_, n) => `%%CIT:${n}%%`);

    // Step 2: 按 %%CIT:n%% 切分
    const segRegex = /%%CIT:(\d+)%%/g;
    const segments: React.ReactNode[] = [];
    let lastIdx = 0;
    let segIdx = 0;
    let m;
    while ((m = segRegex.exec(processed)) !== null) {
      // 前面的 Markdown 片段
      if (m.index > lastIdx) {
        const mdPiece = processed.substring(lastIdx, m.index);
        segments.push(
          <ReactMarkdown key={`md-${segIdx++}`} remarkPlugins={[remarkGfm]}>
            {mdPiece}
          </ReactMarkdown>
        );
      }
      // CitationMark
      const num = parseInt(m[1]);
      const cit = msgCitations.find(c => c.index === num);
      if (cit) {
        segments.push(
          <CitationMark
            key={`cit-${segIdx++}`}
            index={num}
            citationId={cit.id}
            isActive={activeCitation === cit.id}
            onClick={handleCitationClick}
          />
        );
      }
      lastIdx = m.index + m[0].length;
    }
    // 最后的 Markdown 片段
    if (lastIdx < processed.length) {
      segments.push(
        <ReactMarkdown key={`md-${segIdx++}`} remarkPlugins={[remarkGfm]}>
          {processed.substring(lastIdx)}
        </ReactMarkdown>
      );
    }

    return (
      <div>
        {segments}

        {/* 参考文献折叠列表 */}
        {msgCitations.length > 0 && (
          <div className="ref-list">
            <button
              className="ref-toggle"
              onClick={() => {
                const newSet = new Set(expandedRefs);
                if (newSet.has(msgId)) newSet.delete(msgId);
                else newSet.add(msgId);
                setExpandedRefs(newSet);
              }}
            >
              {expandedRefs.has(msgId) ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
              参考文献 {msgCitations.length} 条
            </button>
            {expandedRefs.has(msgId) && (
              <div className="ref-items">
                {msgCitations.map(c => (
                  <div
                    key={c.id}
                    className="ref-item"
                    onClick={() => {
                      onCitationClick(activeCitation === c.id ? null : c.id);
                    }}
                  >
                    <span className="ref-num">[{c.index}]</span>
                    <span className="ref-id">{c.docId}</span>
                    <span style={{ color: 'var(--text-tertiary)', fontSize: 11 }}>第 {c.page} 页</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  const hasContent = messages.length > 0;

  if (!hasContent && !isStreaming) {
    const quickStarts = [
      {
        title: '文献解析',
        desc: '批量抽取观点与参数，自动结构化',
        prompt: '帮我解析上传的文献，抽取核心观点并结构化存入知识库',
      },
      {
        title: '数据处理',
        desc: '清洗标准化，异常自动标注',
        prompt: '帮我清洗上传的实验数据，统一量纲并标注异常值',
      },
      {
        title: '报告生成',
        desc: '按规范组装初稿，自动附引用',
        prompt: '基于已有材料生成一份带引用标记的科研报告，并做合规校验',
      },
    ];
    return (
      <div className="messages-scroll">
        <div className="messages-inner">
          <div className="welcome">
            <div className="welcome-eyebrow">MULTI-AGENT RESEARCH WORKBENCH</div>
            <h1>让每条结论，都能溯回原文</h1>
            <p>
              上传文献与实验数据，主控调度四类 Agent 完成解析、清洗、写作与合规校验；
              所有产出通过 record_id 指针与引用标记全程可追溯。
            </p>
            <div className="welcome-caps">
              <span>三层知识库</span>
              <span>record_id 指针</span>
              <span>引用可溯源</span>
              <span>校验闭环</span>
            </div>
            <div className="quick-cards">
              {quickStarts.map(q => (
                <div
                  key={q.title}
                  className="quick-card"
                  role="button"
                  tabIndex={0}
                  onClick={() => onQuickStart?.(q.prompt)}
                  onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') onQuickStart?.(q.prompt); }}
                >
                  <div className="quick-card-head">
                    <h3>{q.title}</h3>
                    <ArrowUpRight size={13} className="quick-card-arrow" />
                  </div>
                  <p>{q.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="messages-scroll" style={{ position: 'relative' }}>
      <div className="messages-inner" style={{ position: 'relative' }}>
        {messages.map((msg) => (
          <div key={msg.id} className={`message-row ${msg.role}`}>
            {msg.role === 'agent' && <AgentAvatar agent={msg.agent} />}
            <div className={`message-bubble ${msg.role}`}>
              {msg.thinking && (
                <div className="thinking-bubble" style={{ marginBottom: 6 }}>
                  <span className="thinking-dots"><span /><span /><span /></span>
                  {msg.thinking}
                </div>
              )}
              {msg.content && renderContentWithCitations(msg.content, msg.id)}
              {msg.result && <ResultCards result={msg.result} />}
            </div>
            {msg.role === 'user' && <UserAvatar />}
          </div>
        ))}

        {isStreaming && streamingContent && (
          <div className="message-row agent">
            <AgentAvatar />
            <div className="message-bubble agent">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {streamingContent}
              </ReactMarkdown>
              <span style={{
                display: 'inline-block',
                width: '2px',
                height: '14px',
                background: 'var(--brand)',
                marginLeft: '2px',
                verticalAlign: 'text-bottom',
                animation: 'blink 1s infinite',
              }} />
            </div>
          </div>
        )}

        {popupData && (
          <CitationPopup
            citation={popupData.citation}
            position={popupData.position}
            onClose={closePopup}
          />
        )}
      </div>
      <style>{`
        @keyframes blink {
          0%, 50% { opacity: 1; }
          51%, 100% { opacity: 0; }
        }
      `}</style>
    </div>
  );
}
