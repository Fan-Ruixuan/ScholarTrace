'use client';

import { useState, useRef, useEffect } from 'react';
import { Send, Paperclip, X, Square, FileText, Table } from 'lucide-react';

interface UploadedFile {
  id: string;
  name: string;
  type: 'pdf' | 'data' | 'other';
}

interface ChatInputProps {
  onSend: (message: string, files: UploadedFile[]) => void;
  onStop: () => void;
  isStreaming: boolean;
  disabled?: boolean;
}

export default function ChatInput({ onSend, onStop, isStreaming, disabled }: ChatInputProps) {
  const [input, setInput] = useState('');
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 120) + 'px';
    }
  }, [input]);

  const handleSubmit = () => {
    if (isStreaming) {
      onStop();
      return;
    }
    const text = input.trim();
    if (!text && files.length === 0) return;
    onSend(text, files);
    setInput('');
    setFiles([]);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleFileAdd = (fileList: FileList | null) => {
    if (!fileList) return;
    const newFiles: UploadedFile[] = [];
    Array.from(fileList).forEach((f) => {
      const name = f.name;
      const ext = name.split('.').pop()?.toLowerCase();
      let type: UploadedFile['type'] = 'other';
      if (ext === 'pdf') type = 'pdf';
      else if (ext === 'csv' || ext === 'xlsx' || ext === 'xls') type = 'data';
      newFiles.push({
        id: `f-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        name,
        type,
      });
    });
    setFiles(prev => [...prev, ...newFiles]);
  };

  const removeFile = (id: string) => {
    setFiles(prev => prev.filter(f => f.id !== id));
  };

  const quickPrompts = [
    { text: '解析文献', action: '帮我解析上传的文献', icon: <FileText size={11} /> },
    { text: '处理数据', action: '帮我清洗上传的数据并标注异常', icon: <Table size={11} /> },
    { text: '生成报告', action: '基于已有内容生成科研报告', icon: <Send size={11} /> },
  ];

  const handleQuick = (action: string) => {
    setInput(action);
    textareaRef.current?.focus();
  };

  return (
    <div className="input-area">
      <div className="input-wrapper">
        {/* 文件拖拽层 */}
        {isDragging && (
          <div
            style={{
              position: 'absolute',
              bottom: 0,
              left: 0,
              right: 0,
              height: 140,
              background: 'var(--brand-light)',
              border: '2px dashed var(--brand)',
              borderRadius: 10,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--brand)',
              fontSize: 13,
              fontWeight: 500,
              zIndex: 5,
              pointerEvents: 'none',
            }}
          >
            释放以上传文件
          </div>
        )}

        {files.length > 0 && (
          <div className="file-chips">
            {files.map(f => (
              <span key={f.id} className="file-chip">
                {f.type === 'pdf' ? <FileText size={12} /> : f.type === 'data' ? <Table size={12} /> : <Paperclip size={12} />}
                {f.name}
                <button className="file-chip-remove" onClick={() => removeFile(f.id)}>
                  <X size={12} />
                </button>
              </span>
            ))}
          </div>
        )}

        <div
          className="input-box"
          onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={(e) => {
            e.preventDefault();
            setIsDragging(false);
            handleFileAdd(e.dataTransfer.files);
          }}
        >
          <button
            className="btn-ghost"
            style={{ padding: 4 }}
            onClick={() => fileInputRef.current?.click()}
            title="上传文件"
          >
            <Paperclip size={16} color="var(--text-tertiary)" />
          </button>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept=".pdf,.csv,.xlsx,.xls"
            style={{ display: 'none' }}
            onChange={(e) => handleFileAdd(e.target.files)}
          />
          <textarea
            ref={textareaRef}
            rows={1}
            placeholder="上传文献或数据，说明你的需求..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={disabled || isStreaming}
          />
          <button
            className={isStreaming ? 'btn' : 'btn btn-primary'}
            onClick={handleSubmit}
            disabled={disabled}
            style={{ padding: '7px 12px', flexShrink: 0 }}
          >
            {isStreaming ? (
              <>
                <Square size={12} fill="currentColor" />
                停止
              </>
            ) : (
              <>
                <Send size={13} />
                发送
              </>
            )}
          </button>
        </div>

        <div className="quick-actions">
          {quickPrompts.map(q => (
            <button
              key={q.text}
              className="quick-btn"
              onClick={() => handleQuick(q.action)}
              disabled={isStreaming}
            >
              {q.icon}
              {q.text}
            </button>
          ))}
          <span className="input-hint">
            <kbd>Enter</kbd> 发送 · <kbd>Shift</kbd>+<kbd>Enter</kbd> 换行
          </span>
        </div>
      </div>
    </div>
  );
}
