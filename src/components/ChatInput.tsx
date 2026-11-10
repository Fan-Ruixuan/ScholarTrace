"use client";

import { useState, useRef, useEffect } from "react";
import { Send, Paperclip, StopCircle, X, FileText, Sparkles } from "lucide-react";
import type { UploadedFile } from "@/lib/types";

interface ChatInputProps {
  onSend: (message: string, files: UploadedFile[]) => void;
  onStop: () => void;
  isGenerating: boolean;
}

const QUICK_PROMPTS = [
  { label: "解析文献", prompt: "请帮我解析上传的文献，抽取核心观点与实验参数" },
  { label: "处理数据", prompt: "请处理上传的数据文件，清洗并标注异常" },
  { label: "生成报告", prompt: "基于已有解析结果生成一份规范的科研分析报告" },
  { label: "全链路", prompt: "解析文献和处理数据，然后生成报告并进行合规校验" },
];

export default function ChatInput({ onSend, onStop, isGenerating }: ChatInputProps) {
  const [message, setMessage] = useState("");
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [dragActive, setDragActive] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 150) + "px";
    }
  }, [message]);

  const handleSubmit = () => {
    if ((!message.trim() && files.length === 0) || isGenerating) return;
    onSend(message, files);
    setMessage("");
    setFiles([]);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = Array.from(e.target.files || []);
    addFiles(selected);
    e.target.value = "";
  };

  const addFiles = (fileList: File[]) => {
    const newFiles: UploadedFile[] = fileList.map(f => ({
      id: Math.random().toString(36).slice(2, 10),
      name: f.name,
      size: f.size,
      type: f.type,
    }));
    setFiles(prev => [...prev, ...newFiles]);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
    const dropped = Array.from(e.dataTransfer.files);
    addFiles(dropped);
  };

  const removeFile = (id: string) => {
    setFiles(prev => prev.filter(f => f.id !== id));
  };

  return (
    <div className="px-8 pb-5 pt-2" style={{ borderTop: "1px solid var(--border-subtle)", background: "var(--bg-primary)" }}>
      {/* 快捷指令 */}
      {!isGenerating && (
        <div className="flex gap-2 mb-3 flex-wrap">
          {QUICK_PROMPTS.map(p => (
            <button
              key={p.label}
              onClick={() => {
                setMessage(p.prompt);
                textareaRef.current?.focus();
              }}
              className="px-3 py-1.5 text-xs rounded-full transition-all flex items-center gap-1.5"
              style={{
                background: "var(--bg-glass)",
                border: "1px solid var(--border-subtle)",
                color: "var(--text-secondary)",
              }}
              onMouseEnter={e => {
                (e.currentTarget as HTMLElement).style.background = "var(--brand-light)";
                (e.currentTarget as HTMLElement).style.borderColor = "var(--brand)";
                (e.currentTarget as HTMLElement).style.color = "var(--brand)";
              }}
              onMouseLeave={e => {
                (e.currentTarget as HTMLElement).style.background = "var(--bg-glass)";
                (e.currentTarget as HTMLElement).style.borderColor = "var(--border-subtle)";
                (e.currentTarget as HTMLElement).style.color = "var(--text-secondary)";
              }}
            >
              <Sparkles size={11} />
              {p.label}
            </button>
          ))}
        </div>
      )}

      {/* 输入区域 */}
      <div
        className="relative rounded-xl transition-all"
        style={{
          background: "var(--bg-surface)",
          border: `1px solid ${dragActive ? "var(--brand)" : "var(--border-subtle)"}`,
          boxShadow: dragActive ? "0 0 0 3px var(--brand-light)" : "none",
        }}
        onDragOver={e => { e.preventDefault(); setDragActive(true); }}
        onDragLeave={() => setDragActive(false)}
        onDrop={handleDrop}
      >
        {/* 已上传文件 */}
        {files.length > 0 && (
          <div className="flex flex-wrap gap-2 px-4 pt-3">
            {files.map(f => (
              <div
                key={f.id}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs"
                style={{ background: "var(--bg-glass)", border: "1px solid var(--border-subtle)", color: "var(--text-secondary)" }}
              >
                <FileText size={12} style={{ color: "var(--brand)" }} />
                <span className="max-w-[160px] truncate">{f.name}</span>
                <button
                  onClick={() => removeFile(f.id)}
                  className="ml-1 p-0.5 rounded transition-colors hover:bg-white/10"
                >
                  <X size={11} />
                </button>
              </div>
            ))}
          </div>
        )}

        <textarea
          ref={textareaRef}
          value={message}
          onChange={e => setMessage(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="上传文献或数据，输入你的需求..."
          rows={1}
          className="w-full bg-transparent px-4 py-3.5 text-sm resize-none outline-none"
          style={{
            color: "var(--text-primary)",
            maxHeight: 150,
            lineHeight: 1.6,
            paddingBottom: files.length > 0 ? 12 : 14,
          }}
          disabled={isGenerating}
        />

        <div className="flex items-center justify-between px-3 pb-3">
          <div className="flex items-center gap-1">
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept=".pdf,.doc,.docx,.csv,.xlsx,.xls,.txt,.md"
              onChange={handleFileChange}
              className="hidden"
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              className="p-2 rounded-lg transition-colors"
              style={{ color: "var(--text-tertiary)" }}
              title="上传文件"
            >
              <Paperclip size={16} />
            </button>
          </div>

          {isGenerating ? (
            <button
              onClick={onStop}
              className="btn-primary"
              style={{ background: "var(--error)" }}
            >
              <StopCircle size={14} />
              停止
            </button>
          ) : (
            <button
              onClick={handleSubmit}
              disabled={!message.trim() && files.length === 0}
              className="btn-primary"
            >
              <Send size={14} />
              发送
            </button>
          )}
        </div>
      </div>

      <div className="text-center mt-2 text-xs" style={{ color: "var(--text-tertiary)" }}>
        溯研通过多Agent编排确保内容可溯源 · 按 Enter 发送，Shift+Enter 换行
      </div>
    </div>
  );
}
