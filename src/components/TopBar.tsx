"use client";

import { Download, Share2, Clock, Copy, Check } from "lucide-react";
import { useState } from "react";

interface TopBarProps {
  sessionTitle: string;
  isGenerating: boolean;
  hasReport: boolean;
  lastReport: string | null;
}

export default function TopBar({ sessionTitle, isGenerating, hasReport, lastReport }: TopBarProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    if (lastReport) {
      navigator.clipboard.writeText(lastReport);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleDownload = () => {
    if (!lastReport) return;
    const blob = new Blob([lastReport], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${sessionTitle || "科研报告"}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div
      className="h-14 px-6 flex items-center justify-between flex-shrink-0"
      style={{ background: "var(--bg-primary)", borderBottom: "1px solid var(--border-subtle)" }}
    >
      <div className="flex items-center gap-3 min-w-0">
        <div>
          <div className="flex items-center gap-2">
            <h1
              className="text-sm font-medium truncate"
              style={{ color: "var(--text-primary)" }}
            >
              {sessionTitle || "新建任务"}
            </h1>
            {isGenerating && (
              <span
                className="flex items-center gap-1.5 text-xs px-2 py-0.5 rounded"
                style={{ background: "var(--brand-light)", color: "var(--brand)" }}
              >
                <span className="w-1.5 h-1.5 rounded-full animate-node-breath" style={{ background: "currentColor" }} />
                处理中
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <button
          className="btn-ghost"
          disabled={!hasReport}
          onClick={handleCopy}
          style={{ opacity: hasReport ? 1 : 0.4 }}
        >
          {copied ? <Check size={13} /> : <Copy size={13} />}
          {copied ? "已复制" : "复制"}
        </button>
        <button
          className="btn-ghost"
          disabled={!hasReport}
          onClick={handleDownload}
          style={{ opacity: hasReport ? 1 : 0.4 }}
        >
          <Download size={13} />
          导出 MD
        </button>
        <div
          className="w-px h-5 mx-1"
          style={{ background: "var(--border-subtle)" }}
        />
        <button className="btn-ghost">
          <Clock size={13} />
          历史
        </button>
        <button className="btn-ghost">
          <Share2 size={13} />
          分享
        </button>
      </div>
    </div>
  );
}
