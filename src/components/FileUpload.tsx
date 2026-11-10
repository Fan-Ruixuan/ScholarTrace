'use client';

import { useState, useRef, useCallback } from 'react';
import { Upload, FileText, X, FileSpreadsheet, File, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { UploadedFile } from '@/lib/types';

interface FileUploadProps {
  files: UploadedFile[];
  onFilesChange: (files: UploadedFile[]) => void;
  disabled?: boolean;
}

const ACCEPTED_TYPES = {
  'application/pdf': 'pdf',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'excel',
  'application/vnd.ms-excel': 'excel',
  'text/csv': 'csv',
  'application/csv': 'csv',
} as const;

function getFileType(file: File): UploadedFile['type'] {
  const type = ACCEPTED_TYPES[file.type as keyof typeof ACCEPTED_TYPES];
  if (type) return type;
  // 按后缀判断
  const name = file.name.toLowerCase();
  if (name.endsWith('.pdf')) return 'pdf';
  if (name.endsWith('.xlsx') || name.endsWith('.xls')) return 'excel';
  if (name.endsWith('.csv')) return 'csv';
  return 'other';
}

function getFileIcon(type: UploadedFile['type'], className = 'w-5 h-5') {
  switch (type) {
    case 'pdf':
      return <FileText className={className} />;
    case 'excel':
    case 'csv':
      return <FileSpreadsheet className={className} />;
    default:
      return <File className={className} />;
  }
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

export function FileUpload({ files, onFilesChange, disabled }: FileUploadProps) {
  const [isDragging, setIsDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFiles = useCallback((fileList: FileList | File[]) => {
    const newFiles: UploadedFile[] = Array.from(fileList).map(file => ({
      id: Math.random().toString(36).slice(2),
      name: file.name,
      size: file.size,
      type: getFileType(file),
      status: 'uploading',
      progress: 0,
    }));

    onFilesChange([...files, ...newFiles]);

    // 模拟上传进度（真实场景应调用上传API）
    newFiles.forEach((uf, idx) => {
      let progress = 0;
      const interval = setInterval(() => {
        progress += Math.random() * 20 + 10;
        if (progress >= 100) {
          progress = 100;
          clearInterval(interval);
          // 更新为完成状态
          onFilesChange(
            [...files, ...newFiles.map((f, i) => {
              if (i === idx) {
                return { ...f, status: 'done' as const, progress: 100, docId: `doc_${f.id}` };
              }
              return f;
            })]
          );
        } else {
          const updatedNew = [...newFiles];
          updatedNew[idx] = { ...uf, progress: Math.round(progress) };
          // 更新进度
          const updated = [...files];
          newFiles.forEach((nf, ni) => {
            if (ni === idx) updated.push({ ...uf, progress: Math.round(progress) });
            else updated.push(nf);
          });
          // 只在onFilesChange里更新
        }
      }, 200 + Math.random() * 300);
    });
  }, [files, onFilesChange]);

  const removeFile = (id: string) => {
    onFilesChange(files.filter(f => f.id !== id));
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (disabled) return;
    if (e.dataTransfer.files.length > 0) {
      handleFiles(e.dataTransfer.files);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    if (!disabled) setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  return (
    <div>
      {/* 拖拽区域 */}
      <div
        onClick={() => !disabled && inputRef.current?.click()}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        className={cn(
          'border-2 border-dashed rounded-lg p-3 text-center cursor-pointer transition-all',
          isDragging
            ? 'border-blue-400 bg-blue-50'
            : 'border-slate-200 hover:border-blue-300 hover:bg-slate-50',
          disabled && 'opacity-50 cursor-not-allowed',
        )}
      >
        <input
          ref={inputRef}
          type="file"
          multiple
          accept=".pdf,.xlsx,.xls,.csv"
          className="hidden"
          onChange={e => e.target.files && handleFiles(e.target.files)}
          disabled={disabled}
        />
        <div className="flex items-center justify-center gap-2 text-slate-500">
          <Upload className="w-4 h-4" />
          <span className="text-xs">
            拖拽或点击上传 <span className="text-blue-600">文献/数据文件</span>
          </span>
        </div>
        <p className="text-[10px] text-slate-400 mt-1">支持 PDF、Excel、CSV 格式</p>
      </div>

      {/* 已上传文件列表 */}
      {files.length > 0 && (
        <div className="mt-2 space-y-1.5">
          {files.map(file => (
            <div
              key={file.id}
              className={cn(
                'flex items-center gap-2 p-2 rounded-lg border',
                file.status === 'done' ? 'bg-green-50/50 border-green-200' :
                file.status === 'error' ? 'bg-red-50 border-red-200' :
                'bg-slate-50 border-slate-200',
              )}
            >
              <div className={cn(
                'w-8 h-8 rounded flex items-center justify-center flex-shrink-0',
                file.type === 'pdf' ? 'bg-red-100 text-red-600' :
                file.type === 'excel' ? 'bg-green-100 text-green-600' :
                file.type === 'csv' ? 'bg-blue-100 text-blue-600' :
                'bg-slate-100 text-slate-500',
              )}>
                {getFileIcon(file.type, 'w-4 h-4')}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs text-slate-700 font-medium truncate">{file.name}</span>
                </div>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-[10px] text-slate-400">{formatFileSize(file.size)}</span>
                  {file.status === 'uploading' && (
                    <>
                      <div className="flex-1 h-1 bg-slate-200 rounded-full overflow-hidden max-w-[80px]">
                        <div
                          className="h-full bg-blue-500 rounded-full transition-all duration-300"
                          style={{ width: `${file.progress}%` }}
                        />
                      </div>
                      <span className="text-[10px] text-slate-500 font-mono">{file.progress}%</span>
                    </>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-1 flex-shrink-0">
                {file.status === 'done' && <CheckCircle2 className="w-4 h-4 text-green-500" />}
                {file.status === 'uploading' && <Loader2 className="w-4 h-4 text-blue-500 animate-spin" />}
                {file.status === 'error' && <AlertCircle className="w-4 h-4 text-red-500" />}
                {file.status !== 'uploading' && (
                  <button
                    onClick={(e) => { e.stopPropagation(); removeFile(file.id); }}
                    className="w-6 h-6 rounded hover:bg-slate-200 flex items-center justify-center text-slate-400 hover:text-slate-600"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
