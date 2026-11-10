"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  Bot, User, AlertTriangle, CheckCircle2, XCircle,
  FileText, Loader2, Copy, Download, ExternalLink
} from "lucide-react";
import type { Message, Citation, WorkflowResult } from "@/lib/types";

interface MessageListProps {
  messages: Message[];
  isGenerating: boolean;
  onCitationClick: (citation: Citation) => void;
  activeCitation: number | null;
  onExportReport: () => void;
}

interface ParsedMarkdownProps {
  content: string;
  citations: Citation[];
  onCiteClick: (idx: number) => void;
  activeCitation: number | null;
}

// 解析Markdown中的【来源:doc_id=X,page=Y】标记
function parseContentWithCitations(content: string, citations: Citation[]) {
  const parts: Array<{ type: "text"; content: string } | { type: "cite"; index: number; citation: Citation }> = [];
  const citeRegex = /【来源:\s*doc_id=([^,，\s】]+)[,，]\s*page=([^】\s]+)】/g;
  let lastIndex = 0;
  let match;
  let citeIndex = 0;
  const citationMap = new Map<string, Citation>();
  citations.forEach(c => {
    const key = `${c.docId}-${c.page}`;
    citationMap.set(key, c);
  });
  while ((match = citeRegex.exec(content)) !== null) {
    if (match.index > lastIndex) {
      parts.push({ type: "text", content: content.slice(lastIndex, match.index) });
    }
    const docId = match[1];
    const page = match[2];
    const key = `${docId}-${page}`;
    let citation = citationMap.get(key);
    if (!citation) {
      citation = { docId, page, text: "" };
    }
    parts.push({ type: "cite", index: citeIndex++, citation });
    lastIndex = match.index + match[0].length;
  }
  if (lastIndex < content.length) {
    parts.push({ type: "text", content: content.slice(lastIndex) });
  }
  return parts;
}

function ParsedContent({ content, citations, onCiteClick, activeCitation }: ParsedMarkdownProps) {
  const parsed = useMemo(() => parseContentWithCitations(content, citations), [content, citations]);
  const markdownRef = useRef<HTMLDivElement>(null);

  // 分离引用索引表
  const refStart = content.search(/###?\s*(引用索引表|参考文献|引用来源|References)/i);
  const mainContent = refStart > 0 ? content.slice(0, refStart) : content;
  const refSection = refStart > 0 ? content.slice(refStart) : "";

  return (
    <div className="markdown-content" ref={markdownRef}>
      <ReactMarkdown remarkPlugins={[remarkGfm]}>
        {mainContent}
      </ReactMarkdown>

      {/* 渲染引用标注 */}
      {parsed.filter(p => p.type === "cite").length > 0 && (
        <span style={{ display: "none" }} />
      )}

      {/* 引用索引表 */}
      {refSection && (
        <div style={{ marginTop: "24px", paddingTop: "16px", borderTop: "1px solid var(--border-subtle)" }}>
          <ReactMarkdown remarkPlugins={[remarkGfm]}>
            {refSection}
          </ReactMarkdown>
        </div>
      )}

      {/* 参考文献卡片列表 */}
      {parsed.filter(p => p.type === "cite").length > 0 && (
        <div style={{ marginTop: "20px", paddingTop: "16px", borderTop: "1px solid var(--border-subtle)" }}>
          <div
            className="text-xs uppercase tracking-wider mb-3"
            style={{ color: "var(--text-tertiary)", fontSize: "11px", fontWeight: 500, letterSpacing: "0.05em" }}
          >
            参考文献 ({parsed.filter(p => p.type === "cite").length})
          </div>
          <div className="space-y-2">
            {parsed.filter((p): p is Extract<typeof p, { type: "cite" }> => p.type === "cite")
              .filter((p, i, arr) => arr.findIndex(x => x.type === "cite" && x.citation.docId === p.citation.docId && x.citation.page === p.citation.page) === i)
              .map((part, i) => (
                <div
                  key={i}
                  className="flex gap-3 items-start p-2.5 rounded-lg transition-colors cursor-pointer"
                  style={{
                    background: activeCitation === part.index ? "var(--brand-light)" : "transparent",
                    border: activeCitation === part.index ? "1px solid var(--brand)" : "1px solid transparent"
                  }}
                  onClick={() => onCiteClick(part.index)}
                >
                  <span
                    className="citation-mark flex-shrink-0"
                    style={{ cursor: "pointer" }}
                  >
                    [{i + 1}]
                  </span>
                  <div className="flex-1 text-xs min-w-0">
                    <div style={{ color: "var(--text-primary)", fontWeight: 500 }}>
                      文献 {part.citation.docId}
                    </div>
                    <div style={{ color: "var(--text-tertiary)", fontFamily: "JetBrains Mono, monospace", fontSize: "11px", marginTop: 2 }}>
                      第 {part.citation.page} 页
                      {part.citation.recordId && ` · ${part.citation.recordId}`}
                    </div>
                    {part.citation.text && (
                      <div style={{ color: "var(--text-secondary)", marginTop: 4, fontSize: "12px", lineHeight: 1.6 }}>
                        "{part.citation.text.slice(0, 120)}{part.citation.text.length > 120 ? "..." : ""}"
                      </div>
                    )}
                  </div>
                  <ExternalLink size={12} style={{ color: "var(--text-tertiary)", flexShrink: 0, marginTop: 4 }} />
                </div>
              ))}
          </div>
        </div>
      )}

      {/* 自定义组件：在ReactMarkdown渲染后，后处理替换引用标记 */}
      <CitationHighlighter citations={citations} onCiteClick={onCiteClick} activeCitation={activeCitation} containerRef={markdownRef} />
    </div>
  );
}

// 后处理：将页面中【来源:xxx】文本替换为可点击引用
function CitationHighlighter({
  citations, onCiteClick, activeCitation, containerRef
}: {
  citations: Citation[];
  onCiteClick: (idx: number) => void;
  activeCitation: number | null;
  containerRef: React.RefObject<HTMLDivElement | null>;
}) {
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT);
    const textNodes: Text[] = [];
    let node: Node | null;
    while ((node = walker.nextNode())) {
      const text = node.nodeValue || "";
      if (text.includes("【来源:")) {
        textNodes.push(node as Text);
      }
    }
    const citeRegex = /【来源:\s*doc_id=([^,，\s】]+)[,，]\s*page=([^】\s]+)】/g;
    let citeCount = 0;
    textNodes.forEach(textNode => {
      const text = textNode.nodeValue || "";
      const parent = textNode.parentNode;
      if (!parent) return;
      const frag = document.createDocumentFragment();
      let lastIdx = 0;
      let m;
      citeRegex.lastIndex = 0;
      while ((m = citeRegex.exec(text)) !== null) {
        if (m.index > lastIdx) {
          frag.appendChild(document.createTextNode(text.slice(lastIdx, m.index)));
        }
        // 查找对应citation序号
        const docId = m[1], page = m[2];
        const citeIdx = citations.findIndex(c => c.docId === docId && c.page === page);
        const displayIdx = citeIdx >= 0 ? citeIdx + 1 : citeCount + 1;
        const span = document.createElement("span");
        span.className = "citation-mark" + (activeCitation === citeCount ? " active" : "");
        span.textContent = `[${displayIdx}]`;
        span.style.cursor = "pointer";
        span.onclick = (e) => {
          e.stopPropagation();
          onCiteClick(citeCount);
        };
        frag.appendChild(span);
        lastIdx = m.index + m[0].length;
        citeCount++;
      }
      if (lastIdx < text.length) {
        frag.appendChild(document.createTextNode(text.slice(lastIdx)));
      }
      parent.replaceChild(frag, textNode);
    });
  }, [citations, onCiteClick, activeCitation, containerRef]);
  return null;
}

// 工作流结果卡片
function WorkflowResultCard({ result }: { result: WorkflowResult }) {
  if (result.type === "data") {
    let exceptionList: string[] = [];
    try {
      exceptionList = JSON.parse(result.exceptionList || "[]");
    } catch { /* ignore */ }
    return (
      <div className="glass-card p-3 mt-3">
        <div className="flex items-center gap-2 mb-2">
          <CheckCircle2 size={14} style={{ color: "var(--success)" }} />
          <span className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>数据处理完成</span>
        </div>
        <div className="text-xs mb-2">
          <span style={{ color: "var(--text-tertiary)" }}>记录ID：</span>
          <span className="record-chip">{result.recordId}</span>
        </div>
        {exceptionList.length > 0 && (
          <div>
            <div className="flex items-center gap-1.5 mb-1.5" style={{ fontSize: "12px", color: "var(--warning)" }}>
              <AlertTriangle size={12} />
              发现 {exceptionList.length} 处数据异常
            </div>
            <div
              className="text-xs p-2.5 rounded-lg space-y-1"
              style={{ background: "rgba(250,176,5,0.08)", maxHeight: 140, overflowY: "auto" }}
            >
              {exceptionList.slice(0, 8).map((ex, i) => (
                <div key={i} style={{ color: "var(--text-secondary)" }}>• {ex}</div>
              ))}
              {exceptionList.length > 8 && (
                <div style={{ color: "var(--text-tertiary)" }}>... 还有 {exceptionList.length - 8} 项</div>
              )}
            </div>
          </div>
        )}
      </div>
    );
  }

  if (result.type === "check") {
    return (
      <div
        className="glass-card p-3 mt-3"
        style={{
          borderColor: result.passed ? "rgba(64,192,87,0.3)" : "rgba(250,82,82,0.3)",
          borderLeft: `3px solid ${result.passed ? "var(--success)" : "var(--error)"}`
        }}
      >
        <div className="flex items-center gap-2 mb-2">
          {result.passed ? (
            <CheckCircle2 size={14} style={{ color: "var(--success)" }} />
          ) : (
            <XCircle size={14} style={{ color: "var(--error)" }} />
          )}
          <span className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>
            合规校验 {result.passed ? "通过" : "未通过"}
          </span>
          {(result.retryCount || 0) > 0 && (
            <span className="mono text-xs px-1.5 py-0.5 rounded" style={{ background: "rgba(255,255,255,0.06)", color: "var(--warning)" }}>
              重试 {result.retryCount}/2
            </span>
          )}
        </div>
        {result.issues && result.issues.length > 0 && (
          <ul className="text-xs space-y-1" style={{ color: "var(--text-secondary)" }}>
            {result.issues.map((issue, i) => (
              <li key={i}>• {issue}</li>
            ))}
          </ul>
        )}
        {result.passed && (
          <div className="text-xs mt-1" style={{ color: "var(--success)" }}>
            所有结论均有来源支撑，格式规范
          </div>
        )}
      </div>
    );
  }

  if (result.type === "parse") {
    return (
      <div className="glass-card p-3 mt-3">
        <div className="flex items-center gap-2 mb-2">
          <FileText size={14} style={{ color: "#22b8cf" }} />
          <span className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>文献解析完成</span>
        </div>
        <div className="text-xs" style={{ color: "var(--text-tertiary)" }}>
          提取 {result.recordIds?.length || 0} 条结构化观点，已写入 L2 知识库
        </div>
        {result.recordIds && result.recordIds.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-2">
            {result.recordIds.slice(0, 4).map((id, i) => (
              <span key={i} className="record-chip">{id}</span>
            ))}
            {result.recordIds.length > 4 && (
              <span className="mono text-xs" style={{ color: "var(--text-tertiary)" }}>+{result.recordIds.length - 4}</span>
            )}
          </div>
        )}
      </div>
    );
  }

  return null;
}

export default function MessageList({
  messages, isGenerating, onCitationClick, activeCitation, onExportReport
}: MessageListProps) {
  const endRef = useRef<HTMLDivElement>(null);
  const [showExportMenu, setShowExportMenu] = useState(false);

  const hasReport = messages.some(m => m.isReport);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, isGenerating]);

  return (
    <div className="flex-1 overflow-y-auto px-8 py-6" style={{ scrollBehavior: "smooth" }}>
      {messages.length === 0 && (
        <WelcomeScreen />
      )}

      {messages.map((msg, idx) => {
        if (msg.role === "user") {
          return (
            <div key={idx} className="flex justify-end mb-5 animate-fade-up">
              <div
                className="max-w-[75%] rounded-2xl rounded-tr-md px-4 py-3"
                style={{ background: "var(--brand)", color: "#fff" }}
              >
                {msg.files && msg.files.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mb-2">
                    {msg.files.map(f => (
                      <div key={f.id} className="flex items-center gap-1.5 px-2 py-1 rounded-md text-xs" style={{ background: "rgba(255,255,255,0.15)" }}>
                        <FileText size={12} />
                        {f.name}
                      </div>
                    ))}
                  </div>
                )}
                <div style={{ lineHeight: 1.6 }}>{msg.content}</div>
              </div>
            </div>
          );
        }

        return (
          <div key={idx} className="flex gap-3 mb-5 animate-fade-up">
            <div
              className="w-8 h-8 rounded-lg flex-shrink-0 flex items-center justify-center mt-0.5"
              style={{ background: "var(--brand-light)" }}
            >
              <Bot size={16} style={{ color: "var(--brand)" }} />
            </div>
            <div className="flex-1 min-w-0 max-w-[85%]">
              {msg.thinking && (
                <div
                  className="text-xs mb-2 flex items-center gap-1.5"
                  style={{ color: "var(--text-tertiary)" }}
                >
                  <Loader2 size={12} className="animate-spin" />
                  {msg.thinking}
                </div>
              )}

              {msg.content && (
                <div
                  className="glass-card p-4"
                  style={{ borderRadius: "4px 12px 12px 12px" }}
                >
                  <ParsedContent
                    content={msg.content}
                    citations={msg.citations || []}
                    onCiteClick={(i) => {
                      const citeList = msg.citations || [];
                      const cite = parseContentWithCitations(msg.content, citeList)
                        .filter((p): p is Extract<typeof p, { type: "cite" }> => p.type === "cite")[i];
                      if (cite) onCitationClick(cite.citation);
                    }}
                    activeCitation={activeCitation}
                  />
                </div>
              )}

              {/* 工作流结果 */}
              {msg.workflowResults?.map((r, i) => (
                <WorkflowResultCard key={i} result={r} />
              ))}

              {/* 报告顶部操作栏 */}
              {msg.isReport && (
                <div className="flex gap-2 mt-3">
                  <button className="btn-ghost" onClick={onExportReport}>
                    <Download size={13} />
                    导出报告
                  </button>
                  <button
                    className="btn-ghost"
                    onClick={() => {
                      navigator.clipboard.writeText(msg.content);
                    }}
                  >
                    <Copy size={13} />
                    复制全文
                  </button>
                </div>
              )}
            </div>
          </div>
        );
      })}

      {isGenerating && (
        <div className="flex gap-3 mb-5">
          <div
            className="w-8 h-8 rounded-lg flex-shrink-0 flex items-center justify-center mt-0.5"
            style={{ background: "var(--brand-light)" }}
          >
            <Bot size={16} style={{ color: "var(--brand)" }} />
          </div>
          <div
            className="glass-card px-4 py-3 flex items-center gap-2"
            style={{ borderRadius: "4px 12px 12px 12px" }}
          >
            <Loader2 size={14} className="animate-spin" style={{ color: "var(--brand)" }} />
            <span style={{ color: "var(--text-secondary)", fontSize: "13px" }}>
              正在处理
              <span className="cursor-blink" />
            </span>
          </div>
        </div>
      )}

      <div ref={endRef} />
    </div>
  );
}

function WelcomeScreen() {
  const suggestions = [
    { title: "全链路科研流程", desc: "解析文献 + 处理数据 → 生成报告 → 合规校验", icon: "⚡" },
    { title: "文献解析", desc: "上传PDF文献，自动抽取观点、关键词", icon: "📄" },
    { title: "数据处理", desc: "上传CSV/Excel，自动清洗并标注异常", icon: "📊" },
    { title: "生成报告", desc: "基于已有解析结果生成规范报告", icon: "📝" },
  ];
  return (
    <div className="h-full flex flex-col items-center justify-center text-center max-w-2xl mx-auto py-12">
      <div
        className="w-14 h-14 rounded-2xl flex items-center justify-center mb-5"
        style={{ background: "var(--brand-light)" }}
      >
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--brand)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="3" />
          <path d="M12 2v3M12 19v3M4.22 4.22l2.12 2.12M17.66 17.66l2.12 2.12M2 12h3M19 12h3M4.22 19.78l2.12-2.12M17.66 6.34l2.12-2.12" />
        </svg>
      </div>
      <h1 style={{ fontSize: "22px", fontWeight: 600, color: "var(--text-primary)", marginBottom: 8 }}>
        溯研 · 多智能体科研协作平台
      </h1>
      <p style={{ fontSize: "14px", color: "var(--text-secondary)", marginBottom: 36, maxWidth: 480, lineHeight: 1.7 }}>
        上传文献与数据，多个AI Agent将协同完成<span style={{ color: "var(--text-primary)" }}>「解析→处理→撰写→校验」</span>全流程，每条结论均可溯源至原始文献。
      </p>

      <div className="grid grid-cols-2 gap-3 w-full">
        {suggestions.map((s, i) => (
          <button
            key={i}
            className="glass-card p-4 text-left transition-all hover:scale-[1.02]"
            style={{ cursor: "pointer" }}
            onMouseEnter={e => {
              (e.currentTarget as HTMLElement).style.borderColor = "var(--border-active)";
            }}
            onMouseLeave={e => {
              (e.currentTarget as HTMLElement).style.borderColor = "var(--border-subtle)";
            }}
          >
            <div style={{ fontSize: "20px", marginBottom: 8 }}>{s.icon}</div>
            <div style={{ fontSize: "14px", fontWeight: 500, color: "var(--text-primary)", marginBottom: 4 }}>
              {s.title}
            </div>
            <div style={{ fontSize: "12px", color: "var(--text-tertiary)", lineHeight: 1.5 }}>
              {s.desc}
            </div>
          </button>
        ))}
      </div>

      <div
        className="flex items-center gap-4 mt-8 text-xs"
        style={{ color: "var(--text-tertiary)" }}
      >
        <span className="flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full" style={{ background: "var(--success)" }} />
          全链路可追溯
        </span>
        <span>·</span>
        <span>指针传递防上下文超限</span>
        <span>·</span>
        <span>闭环校验兜底</span>
      </div>
    </div>
  );
}
