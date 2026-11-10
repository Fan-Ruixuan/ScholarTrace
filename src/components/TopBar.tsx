'use client';

import { Download, Share2, MoreHorizontal, History, HelpCircle, FileDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Separator } from '@/components/ui/separator';

interface TopBarProps {
  title: string;
  hasContent: boolean;
  onExport?: () => void;
}

export function TopBar({ title, hasContent, onExport }: TopBarProps) {
  return (
    <header className="h-14 border-b border-slate-200 bg-white/80 backdrop-blur-sm flex items-center justify-between px-4 flex-shrink-0">
      <div className="flex items-center gap-3 min-w-0">
        <h2 className="text-sm font-semibold text-slate-800 truncate">{title}</h2>
        <span className="text-xs px-1.5 py-0.5 rounded bg-green-100 text-green-700 flex-shrink-0">
          在线
        </span>
      </div>

      <div className="flex items-center gap-1">
        <Button
          variant="ghost"
          size="sm"
          disabled={!hasContent}
          className="h-8 text-xs text-slate-600 hover:text-slate-800 disabled:opacity-40"
          onClick={onExport}
        >
          <FileDown className="w-3.5 h-3.5 mr-1.5" />
          导出报告
        </Button>
        <Separator orientation="vertical" className="h-5 mx-1" />
        <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-500">
          <Share2 className="w-4 h-4" />
        </Button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-500">
              <MoreHorizontal className="w-4 h-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-44">
            <DropdownMenuItem className="text-xs">
              <History className="w-3.5 h-3.5 mr-2" />
              查看执行历史
            </DropdownMenuItem>
            <DropdownMenuItem className="text-xs">
              <Download className="w-3.5 h-3.5 mr-2" />
              导出会话记录
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="text-xs">
              <HelpCircle className="w-3.5 h-3.5 mr-2" />
              使用帮助
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
