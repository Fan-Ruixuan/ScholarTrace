'use client';

import { Download, Wifi, WifiOff, FolderOpen } from 'lucide-react';

interface TopBarProps {
  apiConfigured: boolean;
  onExport: () => void;
  sessionTitle?: string;
}

export default function TopBar({ apiConfigured, onExport, sessionTitle }: TopBarProps) {
  return (
    <div className="topbar">
      <div className="logo">
        <div className="logo-mark">
          {/* 溯源星链：三节点沿曲线上溯，呼应「溯源+协作」 */}
          <svg width="30" height="30" viewBox="0 0 30 30" fill="none">
            <defs>
              <linearGradient id="logoBg" x1="0" y1="0" x2="30" y2="30">
                <stop offset="0%" stopColor="#3b5bdb" />
                <stop offset="100%" stopColor="#5f3dc4" />
              </linearGradient>
            </defs>
            <rect x="1" y="1" width="28" height="28" rx="8" fill="url(#logoBg)" />
            <path
              d="M8 21 C 12 21, 12 15, 15 15 S 21 15, 22 9"
              stroke="rgba(255,255,255,0.55)"
              strokeWidth="1.6"
              strokeLinecap="round"
              fill="none"
            />
            <circle cx="8" cy="21" r="2.6" fill="#fff" />
            <circle cx="15" cy="15" r="2.2" fill="#fff" opacity="0.85" />
            <circle cx="22" cy="9" r="2.6" fill="#ffd43b" />
          </svg>
        </div>
        <span>溯研</span>
        <span className="logo-sub">SCHOLAR TRACE</span>
        {sessionTitle && (
          <>
            <span className="topbar-sep">/</span>
            <span className="topbar-session">
              <FolderOpen size={11} />
              {sessionTitle}
            </span>
          </>
        )}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <div className={`mode-chip ${apiConfigured ? 'online' : 'offline'}`}>
          <span className="mode-pulse" />
          {apiConfigured ? <Wifi size={12} /> : <WifiOff size={12} />}
          {apiConfigured ? 'Coze API 已连接' : '演示模式'}
        </div>
        <button className="btn" onClick={onExport} title="导出报告">
          <Download size={14} />
          导出报告
        </button>
      </div>
    </div>
  );
}
