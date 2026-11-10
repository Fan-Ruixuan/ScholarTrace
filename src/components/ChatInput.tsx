'use client';

import { useState, useRef, useEffect } from 'react';
import { Send, Paperclip, Square, Lightbulb, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import { FileUpload } from './FileUpload';
import { UploadedFile } from '@/lib/types';

interface ChatInputProps {
  onSend: (message: string, files: UploadedFile[]) => void;
  onStop?: () => void;
  isLoading: boolean;
  disabled?: boolean;
}

const QUICK_SUGGESTIONS = [
  { icon: '📄', text: '解析上传的文献，提取核心观点' },
  { icon: '📊', text: '清洗实验数据并标注异常值' },
  { icon: '📝', text: '基于文献和数据生成研究报告' },
  { icon: '✅', text: '全链路：解析→处理→生成→校验' },
];

export function ChatInput({ onSend, onStop, isLoading, disabled }: ChatInputProps) {
  const [message, setMessage] = useState('');
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [showUpload, setShowUpload] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      textarea.style.height = Math.min(textarea.scrollHeight, 160) + 'px';
    }
  }, [message]);

  const handleSubmit = () => {
    const trimmedMessage = message.trim();
    const doneFiles = files.filter(f => f.status === 'done');
    if (!trimmedMessage && doneFiles.length === 0) return;
    if (isLoading) return;

    onSend(trimmedMessage || '请处理已上传的文件', doneFiles);
    setMessage('');
    setFiles([]);
    setShowUpload(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const allUploading = files.some(f => f.status === 'uploading');
  const canSend = !isLoading && (message.trim().length > 0 || files.some(f => f.status === 'done')) && !allUploading;

  return (
    <div className="border-t border-slate-800/50 bg-slate-900/60 backdrop-blur-xl px-4 pt-3 pb-4">
      {/* 快捷建议 */}
      {!isLoading && message.length === 0 && files.length === 0 && (
        <div className="mb-3 max-w-3xl mx-auto">
          <div className="flex items-center gap-1 text-xs text-slate-500 mb-2 px-1">
            <Lightbulb className="w-3.5 h-3.5 text-amber-400" />
            <span>快捷指令</span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {QUICK_SUGGESTIONS.map((s, idx) => (
              <button
                key={idx}
                onClick={() => {
                  setMessage(s.text);
                  textareaRef.current?.focus();
                }}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-full text-xs bg-slate-800/60 hover:bg-blue-600/20 border border-slate-700/50 hover:border-blue-500/50 text-slate-400 hover:text-blue-300 transition-colors"
              >
                <span>{s.icon}</span>
                <span>{s.text}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* 文件上传区 */}
      {showUpload && (
        <div className="mb-2 max-w-3xl mx-auto">
          <FileUpload files={files} onFilesChange={setFiles} disabled={isLoading} />
        </div>
      )}

      {/* 输入框 */}
      <div className="max-w-3xl mx-auto">
        <div className={cn(
          'border rounded-xl transition-all overflow-hidden',
          isLoading
            ? 'border-slate-700 bg-slate-800/40'
            : 'border-slate-700 bg-slate-800/50 focus-within:border-blue-500/50 focus-within:ring-2 focus-within:ring-blue-500/10',
        )}>
          <textarea
            id="suyan-chat-input"
            ref={textareaRef}
            value={message}
            onChange={e => setMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={files.length > 0 ? '添加说明（可选），按Enter发送...' : '输入你的科研需求，例如：帮我解析上传的文献并生成综述报告...'}
            rows={1}
            disabled={disabled || isLoading}
            className="w-full px-4 py-3 bg-transparent text-sm text-slate-200 placeholder-slate-500 resize-none focus:outline-none disabled:cursor-not-allowed"
            style={{ minHeight: '44px' }}
          />
          <div className="flex items-center justify-between px-3 pb-2">
            <div className="flex items-center gap-1">
              <button
                onClick={() => setShowUpload(!showUpload)}
                disabled={isLoading}
                className={cn(
                  'w-8 h-8 rounded-lg flex items-center justify-center transition-colors',
                  showUpload ? 'bg-blue-500/20 text-blue-400' : 'text-slate-400 hover:bg-slate-700/50 hover:text-slate-200',
                  isLoading && 'opacity-50 cursor-not-allowed',
                )}
                title="上传文件"
              >
                <Paperclip className="w-4 h-4" />
              </button>
              <div className="flex items-center gap-1 text-xs text-slate-500 ml-2">
                <Sparkles className="w-3.5 h-3.5 text-blue-400" />
                <span>支持 PDF / Excel / CSV</span>
              </div>
            </div>

            {isLoading ? (
              <button
                onClick={onStop}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-500/20 text-red-400 text-xs font-medium hover:bg-red-500/30 border border-red-500/30 transition-colors"
              >
                <Square className="w-3 h-3 fill-current" />
                停止
              </button>
            ) : (
              <button
                onClick={handleSubmit}
                disabled={!canSend}
                className={cn(
                  'flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-medium transition-all',
                  canSend
                    ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white hover:from-blue-500 hover:to-indigo-500 shadow-lg shadow-blue-500/20'
                    : 'bg-slate-700/50 text-slate-500 cursor-not-allowed',
                )}
              >
                <Send className="w-3.5 h-3.5" />
                发送
              </button>
            )}
          </div>
        </div>
        <div className="text-center text-[10px] text-slate-600 mt-2">
          溯研Suyan · 多智能体协作 · 所有结论可溯源 · 防幻觉
        </div>
      </div>
    </div>
  );
}
