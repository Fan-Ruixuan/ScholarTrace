'use client';

import { useState } from 'react';
import { X, Copy, Check, BookOpen, Download } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Citation } from '@/lib/types';

interface ReportViewerProps {
  content: string;
  citations?: Citation[];
  onClose: () => void;
}

export function ReportViewer({ content, citations, onClose }: ReportViewerProps) {
  const [copied, setCopied] = useState(false);

  const copyReport = () => {
    navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const downloadReport = () => {
    const blob = new Blob([content], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `溯研报告_${new Date().toLocaleDateString('zh-CN')}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-700/50 rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden">
        {/* 头部 */}
        <div className="flex items-center justify-between p-5 border-b border-slate-800 bg-gradient-to-r from-blue-600/10 to-indigo-600/10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-500/30">
              <BookOpen className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-100">研究报告</h2>
              <p className="text-xs text-slate-400">
                生成时间：{new Date().toLocaleString('zh-CN')}
                {citations && citations.length > 0 && ` · ${citations.length}条来源引用`}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={copyReport}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs transition-colors"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              {copied ? '已复制' : '复制'}
            </button>
            <button
              onClick={downloadReport}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              下载 MD
            </button>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* 报告内容 */}
        <div className="flex-1 overflow-y-auto custom-scrollbar p-6 bg-slate-950/50">
          <div className="max-w-3xl mx-auto">
            <div className="markdown-content prose prose-invert max-w-none bg-slate-900/50 border border-slate-800/50 rounded-xl p-6 shadow-lg">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {content}
              </ReactMarkdown>
            </div>

            {/* 引用索引 */}
            {citations && citations.length > 0 && (
              <div className="mt-6 bg-slate-900/50 border border-slate-800/50 rounded-xl p-5">
                <h3 className="text-sm font-bold text-slate-200 mb-3 flex items-center gap-2">
                  <BookOpen className="w-4 h-4 text-blue-400" />
                  参考文献索引
                </h3>
                <div className="space-y-2">
                  {citations.map((cite, idx) => (
                    <div key={cite.id} className="flex items-start gap-2 text-xs p-2 rounded-lg bg-slate-800/40">
                      <span className="flex-shrink-0 w-5 h-5 rounded-full bg-blue-500/20 text-blue-400 flex items-center justify-center text-[10px] font-bold">
                        {idx + 1}
                      </span>
                      <div className="flex-1">
                        <span className="text-slate-300 font-medium">{cite.docName}</span>
                        <span className="text-slate-500 mx-1">·</span>
                        <span className="text-slate-400">第 {cite.page} 页</span>
                      </div>
                    </div>
                  ))}
                </div>
                <p className="text-[10px] text-slate-500 mt-3 border-t border-slate-800 pt-2">
                  ⓘ 溯研平台溯源机制：所有结论均可通过引用指针对应到原始文献L1库具体位置，有效防止科研场景下的大模型幻觉。
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
