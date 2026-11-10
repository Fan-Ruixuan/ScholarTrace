'use client';

import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Bot, User, AlertTriangle, CheckCircle2, XCircle, Sparkles } from 'lucide-react';
import { useEffect, useRef } from 'react';

export type Citation = {
  id: string;
  docId: string;
  page?: string;
  snippet?: string;
};

export type Message = {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  citations?: Citation[];
  exceptions?: string[];
  checkResult?: { passed: boolean; issues?: string[]; retryCount?: number };
  streaming?: boolean;
};

type MessageListProps = {
  messages: Message[];
  isGenerating: boolean;
};

// 预处理文本，将【来源:xxx】转为[数字]引用标注
function processContent(content: string, citations: Citation[] = []) {
  let processed = content;
  const sourceRegex = /【来源:\s*doc_id=([^,，\s】]+)[,，\s]*page=([^,，\s】]+)[,，\s]*([^】]*)?】/g;
  let match;
  const foundCitations: Citation[] = [...citations];
  let idx = citations.length;

  while ((match = sourceRegex.exec(content)) !== null) {
    const docId = match[1];
    const page = match[2];
    const existingIdx = foundCitations.findIndex((c) => c.docId === docId && c.page === page);
    let citeNum: number;
    if (existingIdx >= 0) {
      citeNum = existingIdx + 1;
    } else {
      idx++;
      citeNum = idx;
      foundCitations.push({ id: `c${citeNum}`, docId, page });
    }
    processed = processed.replace(match[0], `<sup class="citation-mark">[${citeNum}]</sup>`);
  }

  return { processed, allCitations: foundCitations };
}

export function MessageList({ messages, isGenerating }: MessageListProps) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isGenerating]);

  if (messages.length === 0) {
    return (
      <div className="messages-container">
        <div className="messages-inner">
          <div className="welcome">
            <div className="welcome-title">溯研 · 科研协作平台</div>
            <div className="welcome-subtitle">
              多智能体协作完成「读文献 → 理数据 → 出报告」全流程，
              <br />
              每条结论可追溯来源，确保科研严谨性。
            </div>

            <div className="welcome-features">
              <div className="welcome-feature">
                <div className="welcome-feature-title">
                  <FileSearch size={14} style={{ color: '#0891b2' }} />
                  文献解析
                </div>
                <div className="welcome-feature-desc">批量解析PDF，抽取核心观点、关键词、实验参数</div>
              </div>
              <div className="welcome-feature">
                <div className="welcome-feature-title">
                  <Calculator size={14} style={{ color: '#059669' }} />
                  数据处理
                </div>
                <div className="welcome-feature-desc">代码执行清洗、格式标准化、异常值标注</div>
              </div>
              <div className="welcome-feature">
                <div className="welcome-feature-title">
                  <FileText size={14} style={{ color: '#d97706' }} />
                  报告生成
                </div>
                <div className="welcome-feature-desc">按模板组装初稿，强制每条结论附带来源指针</div>
              </div>
              <div className="welcome-feature">
                <div className="welcome-feature-title">
                  <ShieldCheck size={14} style={{ color: '#dc2626' }} />
                  合规校验
                </div>
                <div className="welcome-feature-desc">格式硬校验+逻辑软校验，不达标打回重跑</div>
              </div>
            </div>

            <div className="welcome-actions">
              <button
                className="quick-chip"
                data-quick="帮我解析上传的文献，提取核心观点和关键数据"
              >
                解析文献
              </button>
              <button
                className="quick-chip"
                data-quick="处理上传的实验数据，清洗并标注异常值"
              >
                清洗数据
              </button>
              <button
                className="quick-chip"
                data-quick="基于已解析的文献和数据，生成一份规范的科研报告"
              >
                生成报告
              </button>
              <button
                className="quick-chip"
                data-quick="全链路执行：解析文献、处理数据、生成报告、合规校验"
              >
                一键全流程
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="messages-container">
      <div className="messages-inner">
        {messages.map((msg) => {
          const { processed, allCitations } = processContent(msg.content, msg.citations);

          return (
            <div key={msg.id} className={`message-row ${msg.role}`}>
              <div className={`message-avatar ${msg.role}`}>
                {msg.role === 'user' ? (
                  <User size={14} />
                ) : (
                  <Bot size={14} />
                )}
              </div>
              <div className={`message-bubble ${msg.role}`}>
                {msg.role === 'assistant' ? (
                  <>
                    <div className="markdown-content">
                      <ReactMarkdown
                        remarkPlugins={[remarkGfm]}
                        components={{
                          p: ({ children }) => <p>{children}</p>,
                        }}
                      >
                        {processed}
                      </ReactMarkdown>
                    </div>

                    {/* 数据处理异常 */}
                    {msg.exceptions && msg.exceptions.length > 0 && (
                      <div className="exception-list">
                        <div className="exception-title">
                          <AlertTriangle size={13} />
                          数据异常清单（{msg.exceptions.length}处）
                        </div>
                        {msg.exceptions.slice(0, 6).map((e, i) => (
                          <div key={i} className="exception-item">{e}</div>
                        ))}
                        {msg.exceptions.length > 6 && (
                          <div className="exception-item" style={{ color: '#94a3b8' }}>
                            ... 共{msg.exceptions.length}处
                          </div>
                        )}
                      </div>
                    )}

                    {/* 合规校验结果 */}
                    {msg.checkResult && (
                      <div className={`check-result ${msg.checkResult.passed ? 'pass' : 'fail'}`}>
                        {msg.checkResult.passed ? (
                          <CheckCircle2 size={16} />
                        ) : (
                          <XCircle size={16} />
                        )}
                        <div>
                          <div style={{ fontWeight: 500 }}>
                            {msg.checkResult.passed ? '校验通过' : '校验未通过'}
                            {msg.checkResult.retryCount ? `（第${msg.checkResult.retryCount}次重试）` : ''}
                          </div>
                          {msg.checkResult.issues && msg.checkResult.issues.length > 0 && (
                            <div style={{ fontSize: '12px', marginTop: 4 }}>
                              {msg.checkResult.issues.slice(0, 3).map((issue, i) => (
                                <div key={i}>· {issue}</div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* 引用列表 */}
                    {allCitations.length > 0 && (
                      <div className="citations-panel">
                        <div className="citations-title">参考文献</div>
                        {allCitations.map((c, i) => (
                          <div key={c.id} className="citation-item">
                            <span className="citation-num">[{i + 1}]</span>
                            <div>
                              <div className="citation-doc">
                                文档ID: {c.docId}
                                {c.page && ` · 页码: ${c.page}`}
                              </div>
                              {c.snippet && <div className="citation-text">{c.snippet}</div>}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </>
                ) : (
                  <div>{msg.content}</div>
                )}

                {msg.streaming && (
                  <span className="thinking-indicator" style={{ display: 'inline-flex', marginLeft: 4, verticalAlign: 'middle' }}>
                    <span className="thinking-dot" />
                    <span className="thinking-dot" />
                    <span className="thinking-dot" />
                  </span>
                )}
              </div>
            </div>
          );
        })}

        {isGenerating && messages[messages.length - 1]?.role === 'user' && (
          <div className="message-row assistant">
            <div className="message-avatar assistant">
              <Bot size={14} />
            </div>
            <div className="message-bubble assistant">
              <div className="thinking-indicator">
                <span className="thinking-dot" />
                <span className="thinking-dot" />
                <span className="thinking-dot" />
              </div>
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>
    </div>
  );
}

// 快速导入图标供welcome使用
import { FileSearch, Calculator, FileText, ShieldCheck } from 'lucide-react';
