'use client';

import { useState, useRef, useCallback, type ChangeEvent, type KeyboardEvent } from 'react';
import { Send, Paperclip, Square, X, FileText } from 'lucide-react';

export type UploadedFile = {
  id: string;
  name: string;
  size: number;
  type: string;
  file?: File;
};

type ChatInputProps = {
  onSend: (message: string, files: UploadedFile[]) => void;
  onStop: () => void;
  isGenerating: boolean;
};

export function ChatInput({ onSend, onStop, isGenerating }: ChatInputProps) {
  const [input, setInput] = useState('');
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSend = useCallback(() => {
    const trimmed = input.trim();
    if (!trimmed && files.length === 0) return;
    onSend(trimmed, files);
    setInput('');
    setFiles([]);
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  }, [input, files, onSend]);

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleInput = (e: ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
    const el = e.target;
    el.style.height = 'auto';
    el.style.height = Math.min(el.scrollHeight, 160) + 'px';
  };

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(e.target.files || []);
    const newFiles: UploadedFile[] = selectedFiles.map((f) => ({
      id: `f_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      name: f.name,
      size: f.size,
      type: f.type,
      file: f,
    }));
    setFiles((prev) => [...prev, ...newFiles]);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const removeFile = (id: string) => {
    setFiles((prev) => prev.filter((f) => f.id !== id));
  };

  const handleQuickAction = (text: string) => {
    setInput(text);
    textareaRef.current?.focus();
  };

  return (
    <div className="input-area">
      <div className="input-inner">
        {/* 文件标签 */}
        {files.length > 0 && (
          <div className="file-tags">
            {files.map((f) => (
              <div key={f.id} className="file-tag">
                <FileText size={12} />
                <span>{f.name}</span>
                <button onClick={() => removeFile(f.id)}>
                  <X size={12} />
                </button>
              </div>
            ))}
          </div>
        )}

        <div className="input-box">
          <textarea
            ref={textareaRef}
            id="chat-textarea"
            value={input}
            onChange={handleInput}
            onKeyDown={handleKeyDown}
            placeholder="输入任务指令，或上传文献/数据文件..."
            rows={1}
          />
          <div className="input-footer">
            <div className="input-tools">
              <button
                className="input-tool-btn"
                onClick={() => fileInputRef.current?.click()}
                title="上传文件 (PDF/Excel/CSV)"
              >
                <Paperclip />
              </button>
              <input
                ref={fileInputRef}
                type="file"
                className="hidden-file-input"
                multiple
                accept=".pdf,.csv,.xlsx,.xls,.doc,.docx,.txt"
                onChange={handleFileChange}
              />
            </div>
            {isGenerating ? (
              <button className="send-btn" onClick={onStop} style={{ background: '#dc2626' }}>
                <Square size={11} fill="white" />
                停止
              </button>
            ) : (
              <button
                className="send-btn"
                onClick={handleSend}
                disabled={!input.trim() && files.length === 0}
              >
                <Send size={13} />
                发送
              </button>
            )}
          </div>
        </div>

        <div className="quick-actions">
          <button className="quick-action-btn" onClick={() => handleQuickAction('解析上传的文献，提取核心观点和实验参数')}>
            解析文献
          </button>
          <button className="quick-action-btn" onClick={() => handleQuickAction('清洗上传的数据，标准化格式并标注异常')}>
            处理数据
          </button>
          <button className="quick-action-btn" onClick={() => handleQuickAction('生成一份规范的科研分析报告，包含引用来源')}>
            生成报告
          </button>
          <button className="quick-action-btn" onClick={() => handleQuickAction('全链路执行：解析文献→处理数据→生成报告→合规校验')}>
            一键全流程
          </button>
        </div>
      </div>
    </div>
  );
}
