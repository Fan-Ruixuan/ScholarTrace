"use client";

import { X, FileText, BookOpen, ArrowRight } from "lucide-react";
import type { Citation } from "@/lib/types";

interface CitationPopupProps {
  citation: Citation;
  position: { x: number; y: number };
  onClose: () => void;
}

export default function CitationPopup({ citation, position, onClose }: CitationPopupProps) {
  return (
    <>
      <div
        className="fixed inset-0 z-40"
        onClick={onClose}
      />
      <div
        className="citation-popup z-50 animate-fade-up"
        style={{
          left: Math.min(position.x, window.innerWidth - 400),
          top: Math.min(position.y, window.innerHeight - 300),
        }}
      >
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <BookOpen size={14} style={{ color: "var(--brand)" }} />
            <span style={{ fontSize: "13px", fontWeight: 600, color: "var(--text-primary)" }}>
              来源溯源
            </span>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded transition-colors"
            style={{ color: "var(--text-tertiary)" }}
          >
            <X size={13} />
          </button>
        </div>

        {/* 溯源路径面包屑 */}
        <div
          className="flex items-center gap-1.5 mb-3 text-xs mono"
          style={{ color: "var(--text-tertiary)" }}
        >
          <span>L1 原始库</span>
          <ArrowRight size={10} />
          <span>文献 {citation.docId}</span>
          <ArrowRight size={10} />
          <span>第 {citation.page} 页</span>
        </div>

        {/* 双栏对照：原文 vs 结构化摘要 */}
        <div className="grid grid-cols-2 gap-3">
          <div
            className="p-3 rounded-lg"
            style={{ background: "rgba(132,94,247,0.08)", border: "1px solid rgba(132,94,247,0.2)" }}
          >
            <div className="flex items-center gap-1.5 mb-2">
              <FileText size={11} style={{ color: "#845ef7" }} />
              <span style={{ fontSize: "11px", fontWeight: 500, color: "#845ef7" }}>原文片段</span>
            </div>
            <div style={{ fontSize: "12px", color: "var(--text-secondary)", lineHeight: 1.6, fontStyle: "italic" }}>
              {citation.text
                ? `"${citation.text.slice(0, 150)}${citation.text.length > 150 ? "..." : ""}"`
                : "（原文已存档于L1原始库，未返回片段文本）"
              }
            </div>
          </div>

          <div
            className="p-3 rounded-lg"
            style={{ background: "rgba(51,154,240,0.08)", border: "1px solid rgba(51,154,240,0.2)" }}
          >
            <div className="flex items-center gap-1.5 mb-2">
              <BookOpen size={11} style={{ color: "#339af0" }} />
              <span style={{ fontSize: "11px", fontWeight: 500, color: "#339af0" }}>结构化摘要</span>
            </div>
            <div style={{ fontSize: "12px", color: "var(--text-secondary)", lineHeight: 1.6 }}>
              此结论由文献解析Agent抽取自原文，已写入L2结构化知识库
              {citation.recordId && (
                <div className="mt-2">
                  <span className="record-chip">{citation.recordId}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        <div
          className="mt-3 pt-2 text-xs flex items-center justify-between"
          style={{ borderTop: "1px solid var(--border-subtle)", color: "var(--text-tertiary)" }}
        >
          <span>溯源路径已验证 ✓</span>
          <button className="flex items-center gap-1" style={{ color: "var(--brand)" }}>
            查看完整原文 <ArrowRight size={10} />
          </button>
        </div>
      </div>
    </>
  );
}
