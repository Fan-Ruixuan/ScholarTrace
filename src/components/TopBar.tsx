'use client';

import { Download, Settings, Share2, Wifi, WifiOff } from 'lucide-react';

interface TopBarProps {
  apiConfigured: boolean;
  onExport: () => void;
  sessionTitle?: string;
}

export default function TopBar({ apiConfigured, onExport, sessionTitle }: TopBarProps) {
  return (
    <div className="topbar">
      <div className="logo">
        <div className="logo-mark">溯</div>
        <span>溯研</span>
        {sessionTitle && (
          <>
            <span style={{ color: 'var(--border-active)', margin: '0 6px', fontWeight: 300 }}>/</span>
            <span style={{ fontSize: 13, color: 'var(--text-secondary)', fontWeight: 400 }}>{sessionTitle}</span>
          </>
        )}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', fontSize: 12, color: 'var(--text-secondary)' }}>
          {apiConfigured ? (
            <>
              <span className="status-dot online" />
              已连接 Coze API
            </>
          ) : (
            <>
              <span className="status-dot offline" />
              演示模式
            </>
          )}
        </div>
        <button className="btn btn-ghost" title="分享" disabled>
          <Share2 size={14} />
        </button>
        <button className="btn" onClick={onExport} title="导出报告">
          <Download size={14} />
          导出
        </button>
      </div>
    </div>
  );
}
