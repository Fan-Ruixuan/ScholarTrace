import { AgentType } from './types';
import {
  Brain,
  FileSearch,
  Database,
  FileText,
  ShieldCheck,
} from 'lucide-react';

export function getAgentIcon(type: AgentType, className = 'w-5 h-5') {
  const iconProps = { className };
  switch (type) {
    case 'orchestrator':
      return <Brain {...iconProps} />;
    case 'parse':
      return <FileSearch {...iconProps} />;
    case 'data':
      return <Database {...iconProps} />;
    case 'report':
      return <FileText {...iconProps} />;
    case 'check':
      return <ShieldCheck {...iconProps} />;
  }
}

export function getAgentColor(type: AgentType) {
  switch (type) {
    case 'orchestrator':
      return {
        bg: 'bg-blue-600',
        bgLight: 'bg-blue-50',
        border: 'border-blue-200',
        text: 'text-blue-600',
        textDark: 'text-blue-700',
      };
    case 'parse':
      return {
        bg: 'bg-cyan-600',
        bgLight: 'bg-cyan-50',
        border: 'border-cyan-200',
        text: 'text-cyan-600',
        textDark: 'text-cyan-700',
      };
    case 'data':
      return {
        bg: 'bg-teal-600',
        bgLight: 'bg-teal-50',
        border: 'border-teal-200',
        text: 'text-teal-600',
        textDark: 'text-teal-700',
      };
    case 'report':
      return {
        bg: 'bg-amber-600',
        bgLight: 'bg-amber-50',
        border: 'border-amber-200',
        text: 'text-amber-600',
        textDark: 'text-amber-700',
      };
    case 'check':
      return {
        bg: 'bg-red-600',
        bgLight: 'bg-red-50',
        border: 'border-red-200',
        text: 'text-red-600',
        textDark: 'text-red-700',
      };
  }
}

export function getAgentName(type: AgentType) {
  switch (type) {
    case 'orchestrator':
      return '主调控Agent';
    case 'parse':
      return '文献解析Agent';
    case 'data':
      return '数据处理Agent';
    case 'report':
      return '报告生成Agent';
    case 'check':
      return '合规校验Agent';
  }
}

export function getAgentDescription(type: AgentType) {
  switch (type) {
    case 'orchestrator':
      return '意图识别、任务拆解、分发调度';
    case 'parse':
      return '批量解析、观点抽取、关键词聚类';
    case 'data':
      return '数据清洗、格式标准化、异常标注';
    case 'report':
      return '按模板组装、产出规范初稿';
    case 'check':
      return '来源回溯、逻辑一致性校验';
  }
}
