'use client';

import { useRef, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { ChatMessage, Citation } from '@/lib/types';
import { FileText, Sparkles, User, ExternalLink, FileSpreadsheet, File, Eye } from 'lucide-react';
import { cn } from '@/lib/utils';

interface MessageListProps {
  messages: ChatMessage[];
  isLoading: boolean;
  onViewReport: () => void;
  hasReport: boolean;
}

function CitationPopover({ citation }: { citation: Citation }) {
  return (
    <span className="group/citation relative inline-block mx-0.5">
      <sup className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-blue-500/20 text-blue-400 text-[9px] font-bold cursor-pointer hover:bg-blue-500 hover:text-white transition-colors">
        {citation.id.replace('CITE-', '').slice(0, 2)}
      </sup>
      <div className="invisible group-hover/citation:visible opacity-0 group-hover/citation:opacity-100 transition-all absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-64 p-2.5 rounded-lg bg-slate-900 border border-slate-700 shadow-xl z-50 text-xs pointer-events-none">
        <div className="flex items-center gap-1.5 text-blue-400 font-semibold mb-1">
          <FileText className="w-3 h-3" />
          {citation.docName}
        </div>
        <div className="text-slate-400 mb-1">页码: {citation.page}</div>
        <div className="text-slate-300 leading-relaxed border-t border-slate-700/50 pt-1.5">
          "{citation.snippet}"
        </div>
      </div>
    </span>
  );
}

function FileIcon({ type }: { type: string }) {
  if (type === 'pdf') return <FileText className="w-4 h-4 text-red-400" />;
  if (type === 'excel' || type === 'csv') return <FileSpreadsheet className="w-4 h-4 text-green-400" />;
  return <File className="w-4 h-4 text-slate-400" />;
}

export function MessageList({ messages, isLoading, onViewReport, hasReport }: MessageListProps) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  // 欢迎页
  if (messages.length === 0) {
    return (
      <div className="flex-1 overflow-y-auto flex items-center justify-center p-8">
        <div className="max-w-2xl w-full">
          <div className="text-center mb-10">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 via-indigo-500 to-purple-600 mb-5 shadow-2xl shadow-blue-500/30">
              <Sparkles className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-3xl font-bold text-slate-100 mb-2 tracking-tight">
              你好，科研人
            </h1>
            <p className="text-slate-400 text-sm leading-relaxed max-w-md mx-auto">
              我是溯研，一个由<strong className="text-blue-400">多智能体</strong>协作驱动的科研助手。
              上传文献或数据，我会调度多个 Agent 为你完成解析、清洗、撰写与合规校验，
              <strong className="text-cyan-400">每条结论都有来源</strong>。
            </p>
          </div>

          {/* 核心能力卡片 */}
          <div className="grid grid-cols-2 gap-3 mb-8">
            <CapabilityCard
              icon={<FileText className="w-5 h-5" />}
              color="from-cyan-500/20 to-cyan-600/10 border-cyan-500/30 text-cyan-300"
              title="📄 文献解析"
              desc="批量上传PDF，自动抽取观点、关键词、实验参数，按学科主题索引"
              prompt="帮我解析这篇文献，提取核心观点和实验参数"
            />
            <CapabilityCard
              icon={<FileSpreadsheet className="w-5 h-5" />}
              color="from-teal-500/20 to-teal-600/10 border-teal-500/30 text-teal-300"
              title="📊 数据处理"
              desc="上传CSV/Excel，自动清洗标准化、标注异常值、生成数据质量报告"
              prompt="帮我清洗这份实验数据，标注异常值并标准化格式"
            />
            <CapabilityCard
              icon={<Sparkles className="w-5 h-5" />}
              color="from-amber-500/20 to-amber-600/10 border-amber-500/30 text-amber-300"
              title="📝 一键报告"
              desc="基于文献证据+实验数据生成规范报告，每条结论强制附来源引用"
              prompt="基于上传的文献和数据，生成一份完整的科研分析报告"
            />
            <CapabilityCard
              icon={<div className="w-5 h-5 rounded bg-red-500/20 flex items-center justify-center text-[10px] font-bold text-red-300">✓</div>}
              color="from-red-500/20 to-red-600/10 border-red-500/30 text-red-300"
              title="✅ 合规校验"
              desc="硬性格式检查+软性逻辑比对，幻觉内容直接拦截，保障学术严谨"
              prompt="帮我校验这份报告的引用合规性和逻辑一致性"
            />
          </div>

          {/* 核心创新点 */}
          <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-4 backdrop-blur-sm">
            <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3 text-center">
              两大核心创新
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center">
                <div className="inline-flex items-center gap-1.5 text-blue-400 text-sm font-semibold mb-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" />
                  调度层 Agent编排
                </div>
                <p className="text-[11px] text-slate-500 leading-relaxed">
                  主控拆解任务→无依赖并行分发→有依赖串行等待→校验闭环重试≤2次
                </p>
              </div>
              <div className="text-center">
                <div className="inline-flex items-center gap-1.5 text-cyan-400 text-sm font-semibold mb-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
                  知识层 三层溯源
                </div>
                <p className="text-[11px] text-slate-500 leading-relaxed">
                  L1原文保真→L2结构化快取→L3规则隔离；指针传递不传输长文本
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto px-4 py-6">
      <div className="max-w-3xl mx-auto space-y-6">
        {messages.map((msg) => (
          <div key={msg.id} className={cn('flex gap-3', msg.role === 'user' ? 'justify-end' : 'justify-start')}>
            {msg.role === 'assistant' && (
              <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-500/20">
                <Sparkles className="w-4 h-4 text-white" />
              </div>
            )}

            <div className={cn(
              'max-w-[85%] rounded-2xl',
              msg.role === 'user'
                ? 'bg-gradient-to-br from-blue-600 to-indigo-700 text-white px-4 py-3 shadow-lg shadow-blue-500/10'
                : 'bg-slate-900/60 border border-slate-800/50 text-slate-200 px-5 py-4 backdrop-blur-sm'
            )}>
              {/* 用户消息的文件 */}
              {msg.role === 'user' && msg.files && msg.files.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-2.5">
                  {msg.files.map(file => (
                    <div key={file.id} className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-white/10 border border-white/20 text-xs">
                      <FileIcon type={file.type} />
                      <span className="max-w-[150px] truncate">{file.name}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* 消息内容 */}
              {msg.role === 'user' ? (
                <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.content}</p>
              ) : (
                <div className="markdown-content text-sm prose prose-invert max-w-none">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>
                    {msg.content}
                  </ReactMarkdown>
                  {msg.status === 'streaming' && (
                    <span className="inline-block w-2 h-4 bg-blue-400 animate-pulse ml-0.5" />
                  )}
                </div>
              )}

              {/* 引用列表 */}
              {msg.role === 'assistant' && msg.citations && msg.citations.length > 0 && (
                <div className="mt-4 pt-3 border-t border-slate-800/50">
                  <div className="text-xs font-semibold text-slate-400 mb-2 flex items-center gap-1.5">
                    <FileText className="w-3 h-3" />
                    引用来源 ({msg.citations.length})
                  </div>
                  <div className="space-y-1.5">
                    {msg.citations.map(cite => (
                      <div key={cite.id} className="flex items-start gap-2 text-xs bg-slate-800/40 rounded-lg p-2 border border-slate-700/30">
                        <span className="flex-shrink-0 w-5 h-5 rounded-full bg-blue-500/20 text-blue-400 flex items-center justify-center text-[10px] font-bold">
                          {cite.id.replace('CITE-', '').slice(0, 2)}
                        </span>
                        <div className="flex-1 min-w-0">
                          <div className="text-slate-300 font-medium">{cite.docName} · 第{cite.page}页</div>
                          <div className="text-slate-500 mt-0.5 line-clamp-2">"{cite.snippet}"</div>
                        </div>
                        <ExternalLink className="w-3 h-3 text-slate-600 flex-shrink-0 mt-0.5" />
                      </div>
                    ))}
                  </div>

                  {hasReport && (
                    <button
                      onClick={onViewReport}
                      className="mt-3 w-full flex items-center justify-center gap-2 py-2 rounded-lg bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 text-xs font-medium border border-blue-500/30 transition-colors"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      查看完整报告并导出
                    </button>
                  )}
                </div>
              )}
            </div>

            {msg.role === 'user' && (
              <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-slate-700 flex items-center justify-center">
                <User className="w-4 h-4 text-slate-300" />
              </div>
            )}
          </div>
        ))}

        {isLoading && messages[messages.length - 1]?.role === 'user' && (
          <div className="flex gap-3">
            <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-white" />
            </div>
            <div className="bg-slate-900/60 border border-slate-800/50 rounded-2xl px-5 py-4 flex items-center gap-2">
              <div className="flex gap-1">
                <span className="w-2 h-2 rounded-full bg-blue-400 animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="w-2 h-2 rounded-full bg-blue-400 animate-bounce" style={{ animationDelay: '150ms' }} />
                <span className="w-2 h-2 rounded-full bg-blue-400 animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
              <span className="text-xs text-slate-400">正在调度多智能体协作...</span>
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>
    </div>
  );
}

function CapabilityCard({
  icon, color, title, desc, prompt,
}: {
  icon: React.ReactNode;
  color: string;
  title: string;
  desc: string;
  prompt: string;
}) {
  return (
    <button
      onClick={() => {
        // 发送预设prompt（通过事件冒泡或自定义事件）
        const input = document.querySelector('textarea, input') as HTMLTextAreaElement | null;
        if (input) {
          input.value = prompt;
          input.focus();
          input.dispatchEvent(new Event('input', { bubbles: true }));
        }
      }}
      className={cn(
        'text-left p-4 rounded-xl border bg-gradient-to-br transition-all hover:scale-[1.02] hover:shadow-lg group',
        color
      )}
    >
      <div className="flex items-center gap-2 mb-2">
        {icon}
        <span className="font-semibold text-sm">{title}</span>
      </div>
      <p className="text-xs text-slate-400 leading-relaxed group-hover:text-slate-300 transition-colors">
        {desc}
      </p>
    </button>
  );
}
