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

const ACCEPTED_TYPES: Record<string, UploadedFile['type']> = {
  'application/pdf': 'pdf',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'excel',
  'application/vnd.ms-excel': 'excel',
  'text/csv': 'csv',
};

function getFileType(file: File): UploadedFile['type'] {
  const type = ACCEPTED_TYPES[file.type];
  if (type) return type;
  const name = file.name.toLowerCase();
  if (name.endsWith('.pdf')) return 'pdf';
  if (name.endsWith('.xlsx') || name.endsWith('.xls')) return 'excel';
  if (name.endsWith('.csv')) return 'csv';
  return 'other';
}

function getFileIcon(type: UploadedFile['type'], className = 'w-5 h-5') {
  switch (type) {
    case 'pdf': return <FileText className={className} />;
    case 'excel':
    case 'csv': return <FileSpreadsheet className={className} />;
    default: return <File className={className} />;
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
    const newFiles: UploadedFile[] = Array.from(fileList).map((file, i) => ({
      id: `f_${Date.now()}_${i}`,
      name: file.name,
      size: file.size,
      type: getFileType(file),
      status: 'done' as const,
      progress: 100,
      docId: `doc_${Date.now()}_${i}`,
    }));
    onFilesChange([...files, ...newFiles]);
  }, [files, onFilesChange]);

  const removeFile = (id: string) => {
    onFilesChange(files.filter(f => f.id !== id));
  };

  return (
    <div>
      {/* 拖拽区域 */}
      <div
        onClick={() => !disabled && inputRef.current?.click()}
        onDrop={e => { e.preventDefault(); setIsDragging(false); if (!disabled && e.dataTransfer.files.length) handleFiles(e.dataTransfer.files); }}
        onDragOver={e => { e.preventDefault(); if (!disabled) setIsDragging(true); }}
        onDragLeave={() => setIsDragging(false)}
        className={cn(
          'border-2 border-dashed rounded-lg p-3 text-center cursor-pointer transition-all',
          isDragging ? 'border-blue-400 bg-blue-500/10' : 'border-slate-700 hover:border-blue-500/50 hover:bg-slate-800/30',
          disabled && 'opacity-50 cursor-not-allowed',
        )}
      >
        <input ref={inputRef} type="file" multiple accept=".pdf,.xlsx,.xls,.csv" className="hidden"
          onChange={e => e.target.files && handleFiles(e.target.files)} disabled={disabled} />
        <div className="flex items-center justify-center gap-2 text-slate-400">
          <Upload className="w-4 h-4" />
          <span className="text-xs">拖拽或点击上传 <span className="text-blue-400">文献/数据文件</span></span>
        </div>
        <p className="text-[10px] text-slate-500 mt-1">支持 PDF、Excel、CSV 格式</p>
      </div>

      {/* 已上传文件列表 */}
      {files.length > 0 && (
        <div className="mt-2 space-y-1.5">
          {files.map(file => (
            <div key={file.id} className={cn(
              'flex items-center gap-2 p-2 rounded-lg border',
              file.status === 'done' ? 'bg-emerald-500/10 border-emerald-500/30' :
              file.status === 'error' ? 'bg-red-500/10 border-red-500/30' :
              'bg-slate-800/50 border-slate-700',
            )}>
              <div className={cn(
                'w-8 h-8 rounded flex items-center justify-center flex-shrink-0',
                file.type === 'pdf' ? 'bg-red-500/20 text-red-400' :
                file.type === 'excel' ? 'bg-emerald-500/20 text-emerald-400' :
                file.type === 'csv' ? 'bg-blue-500/20 text-blue-400' :
                'bg-slate-700 text-slate-400',
              )}>
                {getFileIcon(file.type, 'w-4 h-4')}
              </div>
              <div className="flex-1 min-w-0">
                <span className="text-xs text-slate-200 font-medium truncate block">{file.name}</span>
                <span className="text-[10px] text-slate-500">{formatFileSize(file.size)}</span>
              </div>
              <div className="flex items-center gap-1 flex-shrink-0">
                {file.status === 'done' && <CheckCircle2 className="w-4 h-4 text-emerald-400" />}
                {file.status === 'uploading' && <Loader2 className="w-4 h-4 text-blue-400 animate-spin" />}
                {file.status === 'error' && <AlertCircle className="w-4 h-4 text-red-400" />}
                <button onClick={() => removeFile(file.id)} className="w-6 h-6 rounded flex items-center justify-center text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-colors">
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
