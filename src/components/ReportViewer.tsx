'use client';

import { useState } from 'react';
import { X, FileText, Download, Copy, Check, BookOpen, FileDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Citation } from '@/lib/types';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogClose,
} from '@/components/ui/dialog';

interface ReportViewerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  content: string;
  title?: string;
  citations?: Citation[];
}

export function ReportViewer({ open, onOpenChange, content, title = '研究报告', citations }: ReportViewerProps) {
  const [copied, setCopied] = useState(false);

  const copyReport = () => {
    navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const downloadMarkdown = () => {
    const blob = new Blob([content], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${title.replace(/\s+/g, '_')}_${new Date().toISOString().slice(0, 10)}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl h-[85vh] flex flex-col p-0 gap-0 overflow-hidden">
        <DialogHeader className="px-6 py-4 border-b border-slate-200 flex flex-row items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-amber-100 flex items-center justify-center">
              <FileText className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <DialogTitle className="text-base font-semibold text-slate-800">{title}</DialogTitle>
              <p className="text-xs text-slate-500 mt-0.5">
                溯研 · 多智能体协作生成 · {new Date().toLocaleDateString('zh-CN')}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" className="h-8 text-xs" onClick={copyReport}>
              {copied ? <Check className="w-3.5 h-3.5 mr-1 text-green-500" /> : <Copy className="w-3.5 h-3.5 mr-1" />}
              {copied ? '已复制' : '复制全文'}
            </Button>
            <Button size="sm" className="h-8 text-xs bg-amber-600 hover:bg-amber-700" onClick={downloadMarkdown}>
              <Download className="w-3.5 h-3.5 mr-1" />
              下载 MD
            </Button>
            <DialogClose asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <X className="w-4 h-4" />
              </Button>
            </DialogClose>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto bg-slate-50 p-8">
          <div className="max-w-3xl mx-auto bg-white shadow-sm border border-slate-200 rounded-lg p-10">
            {/* 报告头部 */}
            <div className="text-center mb-8 pb-6 border-b border-slate-200">
              <h1 className="text-2xl font-bold text-slate-900 mb-2">{title}</h1>
              <div className="flex items-center justify-center gap-2 text-xs text-slate-500">
                <span>溯研·多智能体科研协作平台生成</span>
                <span>·</span>
                <span>{new Date().toLocaleDateString('zh-CN')}</span>
              </div>
            </div>

            <article className="markdown-content" style={{ fontSize: '15px', lineHeight: '1.8' }}>
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {content}
              </ReactMarkdown>
            </article>

            {/* 引用索引表 */}
            {citations && citations.length > 0 && (
              <div className="mt-10 pt-6 border-t-2 border-slate-300">
                <h2 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                  <BookOpen className="w-5 h-5 text-blue-600" />
                  参考文献索引
                </h2>
                <ol className="space-y-2 text-sm text-slate-700 list-decimal list-inside">
                  {citations.map((cite, idx) => (
                    <li key={cite.id} className="pl-1">
                      <span className="font-medium">{cite.docName}</span>
                      <span className="text-slate-500 ml-2">第 {cite.page} 页</span>
                    </li>
                  ))}
                </ol>
              </div>
            )}

            {/* 生成声明 */}
            <div className="mt-8 p-4 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-800">
              <p className="font-medium mb-1">⚠️ 学术使用声明</p>
              <p className="leading-relaxed text-amber-700">
                本报告由溯研多智能体系统自动生成，所有引用均已标注来源。请在使用前仔细核对原文数据，
                系统不保证100%准确性，最终学术责任由使用者承担。
              </p>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// 简化版报告导出按钮
export function ReportButton({ onClick, disabled, className }: {
  onClick: () => void;
  disabled?: boolean;
  className?: string;
}) {
  return (
    <Button
      onClick={onClick}
      disabled={disabled}
      className={cn('bg-amber-600 hover:bg-amber-700', className)}
    >
      <FileDown className="w-4 h-4 mr-1.5" />
      查看/导出报告
    </Button>
  );
}
