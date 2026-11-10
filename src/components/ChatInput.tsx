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

  // 自动调整高度
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
    <div className="border-t border-slate-200 bg-white">
      <div className="px-4 pt-3">
        {/* 快捷建议 */}
        {!isLoading && message.length === 0 && files.length === 0 && (
          <div className="mb-3">
            <div className="flex items-center gap-1 text-xs text-slate-500 mb-2">
              <Lightbulb className="w-3.5 h-3.5 text-amber-500" />
              <span>快捷指令</span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {QUICK_SUGGESTIONS.map((s, idx) => (
                <button
                  key={idx}
                  onClick={() => setMessage(s.text)}
                  className="flex items-center gap-1 px-2.5 py-1.5 rounded-full text-xs bg-slate-50 hover:bg-blue-50 border border-slate-200 hover:border-blue-200 text-slate-600 hover:text-blue-700 transition-colors"
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
          <div className="mb-2">
            <FileUpload files={files} onFilesChange={setFiles} disabled={isLoading} />
          </div>
        )}

        {/* 输入框 */}
        <div className={cn(
          'border rounded-xl transition-all',
          isLoading ? 'border-slate-200 bg-slate-50' : 'border-slate-300 focus-within:border-blue-400 focus-within:ring-2 focus-within:ring-blue-100',
        )}>
          <textarea
            ref={textareaRef}
            value={message}
            onChange={e => setMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={files.length > 0 ? '添加说明（可选），按Enter发送...' : '输入你的科研需求，例如：帮我解析上传的文献并生成综述报告...'}
            rows={1}
            disabled={disabled || isLoading}
            className="w-full px-4 py-3 bg-transparent text-sm text-slate-800 placeholder-slate-400 resize-none focus:outline-none disabled:cursor-not-allowed"
            style={{ minHeight: '44px' }}
          />
          <div className="flex items-center justify-between px-3 pb-2">
            <div className="flex items-center gap-1">
              <button
                onClick={() => setShowUpload(!showUpload)}
                disabled={isLoading}
                className={cn(
                  'w-8 h-8 rounded-lg flex items-center justify-center transition-colors',
                  showUpload ? 'bg-blue-100 text-blue-600' : 'text-slate-400 hover:bg-slate-100 hover:text-slate-600',
                  isLoading && 'opacity-50 cursor-not-allowed',
                )}
                title="上传文件"
              >
                <Paperclip className="w-4 h-4" />
              </button>
              <div className="flex items-center gap-1 text-xs text-slate-400 ml-2">
                <Sparkles className="w-3.5 h-3.5 text-blue-500" />
                <span>多智能体协作</span>
              </div>
            </div>

            {isLoading ? (
              <button
                onClick={onStop}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-100 text-red-600 text-xs font-medium hover:bg-red-200 transition-colors"
              >
                <Square className="w-3 h-3 fill-current" />
                停止生成
              </button>
            ) : (
              <button
                onClick={handleSubmit}
                disabled={!canSend}
                className={cn(
                  'flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-medium transition-all',
                  canSend
                    ? 'bg-blue-600 text-white hover:bg-blue-700 shadow-sm'
                    : 'bg-slate-100 text-slate-400 cursor-not-allowed',
                )}
              >
                <Send className="w-3.5 h-3.5" />
                发送
              </button>
            )}
          </div>
        </div>

        <p className="text-[10px] text-slate-400 text-center mt-2 pb-2">
          溯研会确保每条结论都可溯源至原始文献。Enter 发送，Shift+Enter 换行
        </p>
      </div>
    </div>
  );
}
