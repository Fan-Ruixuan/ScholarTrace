'use client';

import { Download, Copy, FileText, MoreHorizontal, X } from 'lucide-react';

type TopBarProps = {
  title: string;
  isConnected: boolean;
  hasReport: boolean;
  onExport: () => void;
  onCopyReport: () => void;
};

export function TopBar({
  title,
  isConnected,
  hasReport,
  onExport,
  onCopyReport,
}: TopBarProps) {
  return (
    <header className="topbar">
      <div className="topbar-title">{title}</div>
      <div className="topbar-status">
        <span className="status-dot" />
        {isConnected ? 'API 已连接' : '演示模式'}
      </div>
      <div className="topbar-actions">
        {hasReport && (
          <>
            <button className="topbar-btn" onClick={onCopyReport}>
              <Copy />
              复制
            </button>
            <button className="topbar-btn topbar-btn-primary" onClick={onExport}>
              <Download />
              导出报告
            </button>
          </>
        )}
      </div>
    </header>
  );
}

type ReportViewerProps = {
  content: string;
  citations?: Array<{ id: string; docId: string; page?: string; text?: string }>;
  onClose: () => void;
};

export function ReportViewer({ content, onClose }: ReportViewerProps) {
  const handleDownload = () => {
    const blob = new Blob([content], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `科研报告_${new Date().toLocaleDateString('zh-CN')}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(content);
  };

  // 简单处理markdown为HTML展示
  const formatMarkdown = (md: string) => {
    return md
      .replace(/^### (.*$)/gm, '<h3>$1</h3>')
      .replace(/^## (.*$)/gm, '<h2>$1</h2>')
      .replace(/^# (.*$)/gm, '<h1>$1</h1>')
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\n\n/g, '</p><p>')
      .replace(/^- (.*$)/gm, '<li>$1</li>');
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title">
            <FileText size={16} style={{ display: 'inline', verticalAlign: 'middle', marginRight: 6 }} />
            报告预览
          </div>
          <button className="modal-close" onClick={onClose}>
            <X />
          </button>
        </div>
        <div className="modal-body">
          <div
            className="report-content"
            dangerouslySetInnerHTML={{ __html: formatMarkdown(content) }}
          />
        </div>
        <div className="modal-footer">
          <button className="topbar-btn" onClick={handleCopy}>
            <Copy size={13} />
            复制Markdown
          </button>
          <button className="topbar-btn topbar-btn-primary" onClick={handleDownload}>
            <Download size={13} />
            下载报告
          </button>
        </div>
      </div>
    </div>
  );
}
