'use client';

import { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { User, Bot, Copy, Check, ExternalLink, FileText, BookOpen, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ChatMessage, Citation } from '@/lib/types';

interface MessageListProps {
  messages: ChatMessage[];
  isLoading: boolean;
}

export function MessageList({ messages, isLoading }: MessageListProps) {
  if (messages.length === 0) {
    return <WelcomeScreen />;
  }

  return (
    <div className="flex-1 overflow-y-auto py-6">
      <div className="max-w-3xl mx-auto px-4 space-y-6">
        {messages.map(msg => (
          <MessageBubble key={msg.id} message={msg} />
        ))}
        {isLoading && messages[messages.length - 1]?.role === 'user' && (
          <TypingIndicator />
        )}
      </div>
    </div>
  );
}

function MessageBubble({ message }: { message: ChatMessage }) {
  const isUser = message.role === 'user';
  const [copied, setCopied] = useState(false);

  const copyContent = () => {
    navigator.clipboard.writeText(message.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className={cn('flex gap-3', isUser ? 'flex-row-reverse' : 'flex-row')}>
      {/* 头像 */}
      <div className={cn(
        'w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0',
        isUser ? 'bg-slate-700 text-white' : 'bg-gradient-to-br from-blue-500 to-blue-700 text-white',
      )}>
        {isUser ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
      </div>

      {/* 消息内容 */}
      <div className={cn('flex-1 min-w-0 flex flex-col gap-1', isUser ? 'items-end' : 'items-start')}>
        <div className="flex items-center gap-2 text-xs text-slate-500">
          <span className="font-medium">{isUser ? '你' : '溯研'}</span>
          <span>·</span>
          <span>{new Date(message.timestamp).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}</span>
        </div>

        {/* 附带文件 */}
        {message.files && message.files.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-1 justify-end">
            {message.files.map(file => (
              <div key={file.id} className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-blue-50 border border-blue-100 text-xs text-blue-700">
                <FileText className="w-3 h-3" />
                <span>{file.name}</span>
              </div>
            ))}
          </div>
        )}

        {/* 气泡 */}
        <div className={cn(
          'rounded-2xl px-4 py-3 max-w-[85%]',
          isUser
            ? 'bg-blue-600 text-white rounded-tr-sm'
            : 'bg-white border border-slate-200 text-slate-800 rounded-tl-sm shadow-sm',
          message.status === 'streaming' && 'typing-cursor',
        )}>
          {isUser ? (
            <p className="text-sm leading-relaxed whitespace-pre-wrap">{message.content}</p>
          ) : (
            <div className="markdown-content">
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                components={{
                  a: ({ href, children }) => (
                    <a href={href} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline inline-flex items-center gap-0.5">
                      {children}
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  ),
                  sup: ({ children }) => {
                    // 处理引用标注
                    return <span className="citation-mark">{children}</span>;
                  },
                }}
              >
                {message.content || ' '}
              </ReactMarkdown>
            </div>
          )}
        </div>

        {/* 引用列表 */}
        {!isUser && message.citations && message.citations.length > 0 && (
          <div className="mt-2 w-full max-w-[85%]">
            <div className="bg-slate-50 border border-slate-200 rounded-lg p-3">
              <div className="flex items-center gap-1.5 text-xs font-medium text-slate-600 mb-2">
                <BookOpen className="w-3.5 h-3.5 text-blue-600" />
                <span>引用来源 ({message.citations.length})</span>
              </div>
              <div className="space-y-2">
                {message.citations.map(cite => (
                  <CitationItem key={cite.id} citation={cite} />
                ))}
              </div>
            </div>
          </div>
        )}

        {/* 操作按钮 */}
        {!isUser && message.content && message.status === 'done' && (
          <div className="flex items-center gap-1 mt-1">
            <button
              onClick={copyContent}
              className="flex items-center gap-1 px-2 py-1 rounded text-xs text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
            >
              {copied ? <Check className="w-3 h-3 text-green-500" /> : <Copy className="w-3 h-3" />}
              <span>{copied ? '已复制' : '复制'}</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function CitationItem({ citation }: { citation: Citation }) {
  return (
    <div className="flex gap-2 text-xs">
      <span className="flex-shrink-0 w-5 h-5 rounded bg-blue-100 text-blue-700 flex items-center justify-center font-mono text-[10px] font-semibold">
        {citation.id}
      </span>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-medium text-slate-700 truncate">{citation.docName}</span>
          <span className="text-slate-400 flex-shrink-0">P.{citation.page}</span>
        </div>
        <p className="text-slate-500 mt-0.5 line-clamp-2 leading-relaxed">{citation.snippet}</p>
      </div>
    </div>
  );
}

function TypingIndicator() {
  return (
    <div className="flex gap-3">
      <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center flex-shrink-0">
        <Bot className="w-4 h-4 text-white" />
      </div>
      <div className="bg-white border border-slate-200 rounded-2xl rounded-tl-sm px-4 py-3 shadow-sm">
        <div className="flex items-center gap-1.5">
          <div className="w-2 h-2 rounded-full bg-blue-400 animate-bounce" style={{ animationDelay: '0ms' }} />
          <div className="w-2 h-2 rounded-full bg-blue-400 animate-bounce" style={{ animationDelay: '150ms' }} />
          <div className="w-2 h-2 rounded-full bg-blue-400 animate-bounce" style={{ animationDelay: '300ms' }} />
          <span className="text-xs text-slate-400 ml-2">正在调度Agent...</span>
        </div>
      </div>
    </div>
  );
}

function WelcomeScreen() {
  return (
    <div className="flex-1 flex items-center justify-center px-4">
      <div className="max-w-xl text-center">
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center mx-auto mb-5 shadow-lg shadow-blue-500/20">
          <span className="text-white text-2xl font-bold">溯</span>
        </div>
        <h1 className="text-2xl font-semibold text-slate-800 mb-2">溯研 · 多智能体科研协作平台</h1>
        <p className="text-sm text-slate-500 mb-8 leading-relaxed">
          上传你的文献和实验数据，系统将自动调度多个智能体协作完成
          <br />
          <span className="text-cyan-600 font-medium">文献解析</span> · <span className="text-teal-600 font-medium">数据处理</span> · <span className="text-amber-600 font-medium">报告生成</span> · <span className="text-red-600 font-medium">合规校验</span>
        </p>

        <div className="grid grid-cols-2 gap-3 text-left">
          <FeatureCard
            icon="🧠"
            title="智能编排调度"
            desc="主控Agent自动拆解任务，无依赖任务并行执行"
          />
          <FeatureCard
            icon="📚"
            title="三层知识库"
            desc="原始库/结构化库/规则库分离，数据不混污染"
          />
          <FeatureCard
            icon="🔗"
            title="全程可溯源"
            desc="每条结论强制携带来源指针，文末自动生成索引"
          />
          <FeatureCard
            icon="🛡️"
            title="闭环校验"
            desc="硬性格式代码校验+软性逻辑大模型校验，不达标自动打回"
          />
        </div>

        <div className="mt-6 flex items-center justify-center gap-2 text-xs text-slate-400">
          <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
          <span>科研无小事——所有AI生成内容均需人工复核</span>
        </div>
      </div>
    </div>
  );
}

function FeatureCard({ icon, title, desc }: { icon: string; title: string; desc: string }) {
  return (
    <div className="p-4 rounded-xl border border-slate-200 bg-white hover:border-blue-200 hover:shadow-sm transition-all">
      <div className="text-xl mb-2">{icon}</div>
      <h3 className="text-sm font-semibold text-slate-800 mb-0.5">{title}</h3>
      <p className="text-xs text-slate-500 leading-relaxed">{desc}</p>
    </div>
  );
}
