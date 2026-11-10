'use client';

import { Download, Settings, Sparkles, Wifi, WifiOff } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface TopBarProps {
  onExportReport: () => void;
  hasReport: boolean;
  apiStatus?: {
    configured: boolean;
    mode: string;
    workflows: Record<string, boolean>;
  } | null;
}

export function TopBar({ onExportReport, hasReport, apiStatus }: TopBarProps) {
  const allWorkflowsConnected = apiStatus?.workflows &&
    Object.values(apiStatus.workflows).every(Boolean);

  return (
    <header className="h-14 flex-shrink-0 border-b border-slate-800/50 bg-slate-900/60 backdrop-blur-xl flex items-center justify-between px-5 z-10">
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 via-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-blue-500/20">
            <Sparkles className="w-4 h-4 text-white" />
          </div>
          <div>
            <h1 className="text-sm font-bold text-slate-100 tracking-tight">溯研 Suyan</h1>
            <p className="text-[10px] text-slate-500">多智能体科研协作平台</p>
          </div>
        </div>

        <div className="h-6 w-px bg-slate-700/50 mx-2" />

        {/* API状态指示 */}
        {apiStatus && (
          <div className="flex items-center gap-1.5">
            {apiStatus.configured && allWorkflowsConnected ? (
              <>
                <Wifi className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-[11px] text-emerald-400 font-medium">
                  Coze平台已连接
                </span>
                <span className="text-[10px] text-slate-500 ml-1 px-1.5 py-0.5 rounded bg-slate-800/50">
                  {apiStatus.mode === 'orchestrator' ? '主控编排' : 'Bot对话'}
                </span>
              </>
            ) : (
              <>
                <WifiOff className="w-3.5 h-3.5 text-amber-400" />
                <span className="text-[11px] text-amber-400">演示模式</span>
              </>
            )}
          </div>
        )}
      </div>

      <div className="flex items-center gap-2">
        {hasReport && (
          <Button
            size="sm"
            onClick={onExportReport}
            className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white border-0 shadow-lg shadow-blue-500/20 text-xs"
          >
            <Download className="w-3.5 h-3.5 mr-1.5" />
            查看报告
          </Button>
        )}
        <Button variant="ghost" size="icon" className="text-slate-400 hover:text-slate-200">
          <Settings className="w-4 h-4" />
        </Button>
      </div>
    </header>
  );
}
