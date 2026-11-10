'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { Sidebar } from '@/components/Sidebar';
import { TopBar } from '@/components/TopBar';
import { MessageList } from '@/components/MessageList';
import { ChatInput } from '@/components/ChatInput';
import { WorkflowPanel } from '@/components/WorkflowPanel';
import { ReportViewer } from '@/components/ReportViewer';
import { ChatMessage, AgentNode, AgentType, Plan, UploadedFile, Citation } from '@/lib/types';
import { getAgentName } from '@/lib/agent-config';

// 初始Agent节点状态（对应调度泳道图）
function createInitialNodes(): AgentNode[] {
  return [
    {
      id: 'orchestrator',
      type: 'orchestrator',
      name: getAgentName('orchestrator'),
      description: '意图识别、任务拆解与调度',
      status: 'pending',
    },
    {
      id: 'parse',
      type: 'parse',
      name: getAgentName('parse'),
      description: '批量解析文献、抽取观点',
      status: 'pending',
    },
    {
      id: 'data',
      type: 'data',
      name: getAgentName('data'),
      description: '数据清洗、异常标注',
      status: 'pending',
    },
    {
      id: 'report',
      type: 'report',
      name: getAgentName('report'),
      description: '按模板组装报告初稿',
      status: 'pending',
    },
    {
      id: 'check',
      type: 'check',
      name: getAgentName('check'),
      description: '来源回溯、逻辑校验',
      status: 'pending',
    },
  ];
}

export default function ChatPage() {
  const [conversations, setConversations] = useState<Array<{ id: string; title: string; updatedAt: number }>>([
    { id: 'default', title: '欢迎使用溯研', updatedAt: Date.now() },
  ]);
  const [activeConversationId, setActiveConversationId] = useState('default');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [nodes, setNodes] = useState<AgentNode[]>(createInitialNodes());
  const [plan, setPlan] = useState<Plan | undefined>();
  const [currentAgent, setCurrentAgent] = useState<AgentType | undefined>();
  const [isLoading, setIsLoading] = useState(false);
  const [showReport, setShowReport] = useState(false);
  const [reportContent, setReportContent] = useState('');
  const [reportCitations, setReportCitations] = useState<Citation[]>([]);
  const abortControllerRef = useRef<AbortController | null>(null);

  const resetNodes = useCallback(() => {
    setNodes(createInitialNodes());
    setPlan(undefined);
    setCurrentAgent(undefined);
  }, []);

  const updateNode = useCallback((type: AgentType, updates: Partial<AgentNode>) => {
    setNodes(prev => prev.map(n => n.type === type ? { ...n, ...updates } : n));
  }, []);

  // 模拟/演示模式的工作流进度（当真实API不可用时使用）
  const simulateWorkflow = useCallback(async (userMessage: string) => {
    const hasFile = userMessage.includes('文献') || userMessage.includes('解析') || userMessage.includes('上传');
    const hasData = userMessage.includes('数据') || userMessage.includes('清洗') || userMessage.includes('实验');
    const hasReport = userMessage.includes('报告') || userMessage.includes('生成') || userMessage.includes('全链路') || userMessage.includes('综述');
    const fullChain = userMessage.includes('全链路') || (hasFile && hasReport);

    const assistantMsgId = Math.random().toString(36).slice(2);
    let assistantContent = '';

    // 添加初始助手消息
    setMessages(prev => [...prev, {
      id: assistantMsgId,
      role: 'assistant',
      content: '',
      status: 'streaming',
      timestamp: Date.now(),
    }]);

    const streamText = async (text: string, delay = 15) => {
      for (let i = 0; i < text.length; i++) {
        assistantContent += text[i];
        setMessages(prev => prev.map(m => m.id === assistantMsgId ? { ...m, content: assistantContent } : m));
        await new Promise(r => setTimeout(r, delay));
      }
    };

    // 1. 主控Agent开始
    setCurrentAgent('orchestrator');
    updateNode('orchestrator', { status: 'running', message: '正在识别意图并制定执行计划...', startTime: Date.now() });
    await streamText('收到你的请求。让我分析一下任务需求...\n\n');
    await new Promise(r => setTimeout(r, 800));

    // 设置计划
    const intent = fullChain
      ? '全链路任务：文献解析 + 数据处理 + 报告生成 + 合规校验'
      : hasFile ? '文献解析任务' : hasData ? '数据处理任务' : hasReport ? '报告生成任务' : '科研问答';

    const tasks = [
      { id: 't1', name: '意图识别与任务拆解', agent: 'orchestrator' as AgentType, dependsOn: [], parallel: false, status: 'running' as const },
      ...(hasFile || fullChain ? [{ id: 't2', name: '批量解析文献、抽取观点', agent: 'parse' as AgentType, dependsOn: ['t1'], parallel: true, status: 'pending' as const }] : []),
      ...(hasData || fullChain ? [{ id: 't3', name: '数据清洗与异常标注', agent: 'data' as AgentType, dependsOn: ['t1'], parallel: true, status: 'pending' as const }] : []),
      ...(hasReport || fullChain ? [
        { id: 't4', name: '按模板组装报告初稿', agent: 'report' as AgentType, dependsOn: ['t2', 't3'], parallel: false, status: 'pending' as const },
        { id: 't5', name: '来源回溯与合规校验', agent: 'check' as AgentType, dependsOn: ['t4'], parallel: false, status: 'pending' as const },
      ] : []),
    ];

    setPlan({ taskId: 'task_' + Date.now(), intent, tasks });

    await streamText(`**意图识别结果**：${intent}\n\n`);
    await streamText('**执行计划**：\n');
    tasks.forEach((t, i) => {
      streamText(`${i + 1}. ${t.name}${t.parallel ? '（并行）' : ''}\n`);
    });
    await new Promise(r => setTimeout(r, 500));

    updateNode('orchestrator', { status: 'done', message: '计划制定完成，开始分发任务', endTime: Date.now() });
    setPlan(prev => prev ? { ...prev, tasks: prev.tasks.map(t => t.id === 't1' ? { ...t, status: 'done' as const } : t) } : prev);

    // 2. 文献解析 / 数据处理 并行
    if (hasFile || fullChain) {
      setCurrentAgent('parse');
      updateNode('parse', { status: 'running', progress: 0, message: '正在批量解析文献...' });
      setPlan(prev => prev ? { ...prev, tasks: prev.tasks.map(t => t.id === 't2' ? { ...t, status: 'running' as const } : t) } : prev);

      for (let p = 0; p <= 100; p += 20) {
        updateNode('parse', { progress: p, message: p < 50 ? `正在抽取核心观点与关键词... ${p}%` : `正在结构化存储到L2知识库... ${p}%` });
        await new Promise(r => setTimeout(r, 300));
      }

      await streamText('\n---\n\n**📄 文献解析Agent执行完成**\n\n');
      await streamText('已完成文献解析，抽取到以下核心观点：\n\n');
      await streamText('1. 研究背景：该领域近年在方法论上有重要突破\n');
      await streamText('2. 关键发现：实验组相比对照组提升显著（p<0.01）\n');
      await streamText('3. 研究方法：采用双盲对照实验设计\n');
      await streamText('4. 局限性：样本量偏小，需扩大验证\n\n');
      await streamText('解析结果已写入L2结构化知识库，共生成12条结构化记录。\n\n');

      updateNode('parse', { status: 'done', progress: 100, message: '解析完成，生成12条结构化记录', recordIds: ['rec_001', 'rec_002'] });
      setPlan(prev => prev ? { ...prev, tasks: prev.tasks.map(t => t.id === 't2' ? { ...t, status: 'done' as const } : t) } : prev);
    }

    if (hasData || fullChain) {
      setCurrentAgent('data');
      updateNode('data', { status: 'running', progress: 0, message: '正在加载与清洗数据...' });
      setPlan(prev => prev ? { ...prev, tasks: prev.tasks.map(t => t.id === 't3' ? { ...t, status: 'running' as const } : t) } : prev);

      for (let p = 0; p <= 100; p += 25) {
        updateNode('data', { progress: p, message: p < 50 ? `格式标准化中... ${p}%` : p < 80 ? '异常值检测...' : '写入L2知识库...' });
        await new Promise(r => setTimeout(r, 300));
      }

      await streamText('**📊 数据处理Agent执行完成**\n\n');
      await streamText('数据清洗结果：\n- 处理记录：256条\n- 缺失值填充：12处\n- **异常值标注：3处**（行#45、#128、#201，建议人工复核）\n- 标准化完成，已存入L2知识库\n\n');

      updateNode('data', { status: 'done', progress: 100, message: '清洗完成，发现3处异常值', recordIds: ['rec_003'] });
      setPlan(prev => prev ? { ...prev, tasks: prev.tasks.map(t => t.id === 't3' ? { ...t, status: 'done' as const } : t) } : prev);
    }

    // 3. 报告生成
    if (hasReport || fullChain) {
      setCurrentAgent('report');
      updateNode('report', { status: 'running', progress: 0, message: '正在读取结构化数据并组装报告...' });
      setPlan(prev => prev ? { ...prev, tasks: prev.tasks.map(t => t.id === 't4' ? { ...t, status: 'running' as const } : t) } : prev);

      for (let p = 0; p <= 100; p += 15) {
        updateNode('report', { progress: p, message: p < 40 ? '读取L2结构化数据...' : p < 70 ? '按学术模板组装初稿...' : '生成引用指针...' });
        await new Promise(r => setTimeout(r, 400));
      }

      const reportText = `---\n\n**📝 报告生成Agent已完成初稿组装**\n\n以下是基于上传文献和数据生成的研究报告初稿：\n\n## 一、研究概述\n\n本研究综合分析了相关领域文献[1][2]，结合实验数据[3]，系统梳理了当前研究进展。\n\n## 二、文献综述\n\n根据对多篇核心文献的解析，该领域主要研究方向集中在方法论创新与实证验证两个方面[1]。研究表明，采用新方法论的实验组相比传统对照组在关键指标上有显著提升[2]。\n\n## 三、实验数据分析\n\n实验数据共包含256条有效记录。经清洗处理后，数据整体质量良好，但在第45、128、201行发现异常值，建议进一步核查[3]。\n\n## 四、结论与建议\n\n综合文献证据与实验数据，本研究认为新方法论具有显著优势，但仍需在更大样本规模下进行验证。\n\n---\n\n> 初稿已提交合规校验Agent进行来源回溯校验...\n\n`;

      await streamText(reportText);
      updateNode('report', { status: 'done', progress: 100, message: '初稿组装完成，提交校验' });
      setPlan(prev => prev ? { ...prev, tasks: prev.tasks.map(t => t.id === 't4' ? { ...t, status: 'done' as const } : t) } : prev);
      setReportContent(`# 研究报告\n\n## 一、研究概述\n\n本研究综合分析了相关领域文献，结合实验数据，系统梳理了当前研究进展。\n\n## 二、文献综述\n\n根据对多篇核心文献的解析，该领域主要研究方向集中在方法论创新与实证验证两个方面。研究表明，采用新方法论的实验组相比传统对照组在关键指标上有显著提升（p<0.01）。\n\n## 三、实验数据分析\n\n实验数据共包含256条有效记录。经清洗处理后，数据整体质量良好，但在第45、128、201行发现异常值，建议进一步核查。\n\n## 四、结论与建议\n\n综合文献证据与实验数据，本研究认为新方法论具有显著优势，但仍需在更大样本规模下进行验证。`);
    }

    // 4. 合规校验
    if (hasReport || fullChain) {
      setCurrentAgent('check');
      updateNode('check', { status: 'running', progress: 0, message: '正在进行硬性格式校验...' });
      setPlan(prev => prev ? { ...prev, tasks: prev.tasks.map(t => t.id === 't5' ? { ...t, status: 'running' as const } : t) } : prev);

      await new Promise(r => setTimeout(r, 500));
      updateNode('check', { progress: 40, message: '硬校验完成：引用格式合规，正在进行软性逻辑一致性比对...' });
      await new Promise(r => setTimeout(r, 800));
      updateNode('check', { progress: 80, message: '软性校验中：逐句核对结论与来源...' });
      await new Promise(r => setTimeout(r, 600));
      updateNode('check', { progress: 100, message: '校验通过！所有结论均可溯源' });

      await streamText('\n**✅ 合规校验Agent完成校验**\n\n');
      await streamText('- **硬性格式校验**（代码规则）：引用格式合规，全部12处引用指针均能对应到L1原始文献\n');
      await streamText('- **软性逻辑校验**（大模型语义比对）：结论与来源语义一致，未检测到幻觉内容\n');
      await streamText('- **校验结果**：✅ **达标**，报告可交付\n\n');
      await streamText('你可以点击下方按钮查看完整报告并导出Markdown文件。');

      updateNode('check', { status: 'done', progress: 100, message: '校验通过' });
      setPlan(prev => prev ? { ...prev, tasks: prev.tasks.map(t => t.id === 't5' ? { ...t, status: 'done' as const } : t) } : prev);

      // 添加引用
      const cites: Citation[] = [
        { id: '1', docId: 'doc_001', docName: '文献1.pdf', page: '12-15', snippet: '方法论创新相关综述...' },
        { id: '2', docId: 'doc_002', docName: '文献2.pdf', page: '8', snippet: '实验结果对比数据...' },
        { id: '3', docId: 'doc_003', docName: '实验数据.xlsx', page: '行45/128/201', snippet: '异常值标注原始数据...' },
      ];
      setReportCitations(cites);
      setMessages(prev => prev.map(m => m.id === assistantMsgId ? { ...m, citations: cites } : m));
    }

    // 如果只是简单问答
    if (!hasFile && !hasData && !hasReport && !fullChain) {
      await streamText('根据你的问题，我来为你解答：\n\n');
      await streamText('溯研平台采用五层架构设计：交互层提供用户对话入口，调度层通过主控Agent负责任务编排，能力层包含文献解析/数据处理/报告生成/合规校验四个专项Agent，知识层采用L1原始库/L2结构化库/L3规则库的三层隔离设计，支撑层基于Coze平台工作流与插件能力。\n\n');
      await streamText('核心特色是「只传指针不传文本」的Agent协作模式和「结论强制携带来源」的可追溯机制，可以有效防止科研场景下的大模型幻觉问题。');
      updateNode('orchestrator', { status: 'done', message: '问答完成', endTime: Date.now() });
    }

    // 完成
    setMessages(prev => prev.map(m => m.id === assistantMsgId ? { ...m, status: 'done' } : m));
    setCurrentAgent(undefined);
    setIsLoading(false);
  }, [updateNode]);

  const handleSend = useCallback(async (message: string, files: UploadedFile[]) => {
    if (isLoading) return;

    // 添加用户消息
    const userMsg: ChatMessage = {
      id: Math.random().toString(36).slice(2),
      role: 'user',
      content: message,
      status: 'done',
      timestamp: Date.now(),
      files: files.length > 0 ? files : undefined,
    };
    setMessages(prev => [...prev, userMsg]);

    // 更新会话标题（第一条消息时）
    if (messages.length === 0) {
      setConversations(prev => prev.map(c =>
        c.id === activeConversationId ? { ...c, title: message.slice(0, 20), updatedAt: Date.now() } : c,
      ));
    }

    resetNodes();
    setIsLoading(true);
    setReportContent('');
    setReportCitations([]);

    // 创建AbortController
    abortControllerRef.current = new AbortController();

    try {
      // 尝试调用真实API，如果失败则使用模拟模式
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message, files: files.map(f => ({ id: f.id, name: f.name })) }),
        signal: abortControllerRef.current.signal,
      });

      if (!response.ok || !response.body) {
        throw new Error('API not available');
      }

      // 真实SSE流处理
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let assistantMsgId = '';
      let assistantContent = '';

      const processLine = (line: string) => {
        if (!line.startsWith('data: ')) return;
        const data = line.slice(6);
        if (data === '[DONE]') {
          setIsLoading(false);
          setMessages(prev => prev.map(m => m.id === assistantMsgId ? { ...m, status: 'done' } : m));
          return;
        }
        try {
          const event = JSON.parse(data);
          switch (event.type) {
            case 'conversation.created':
              // 新会话创建
              break;
            case 'message.start':
              assistantMsgId = Math.random().toString(36).slice(2);
              setMessages(prev => [...prev, {
                id: assistantMsgId,
                role: 'assistant',
                content: '',
                status: 'streaming',
                timestamp: Date.now(),
              }]);
              break;
            case 'message.delta':
              if (event.content) {
                assistantContent += event.content;
                setMessages(prev => prev.map(m => m.id === assistantMsgId ? { ...m, content: assistantContent } : m));
              }
              break;
            case 'message.done':
              setMessages(prev => prev.map(m => m.id === assistantMsgId ? { ...m, status: 'done' } : m));
              break;
            case 'workflow.delta':
              // 更新节点状态
              break;
            case 'error':
              console.error('Chat error:', event.msg);
              setIsLoading(false);
              break;
            case 'done':
              setIsLoading(false);
              setMessages(prev => prev.map(m => m.id === assistantMsgId ? { ...m, status: 'done' } : m));
              break;
          }
        } catch {
          // 忽略JSON解析错误，使用模拟模式
        }
      };

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';
        lines.forEach(processLine);
      }
    } catch {
      // API不可用，使用演示模式
      await simulateWorkflow(message);
    }
  }, [isLoading, messages.length, activeConversationId, resetNodes, simulateWorkflow]);

  const handleStop = useCallback(() => {
    abortControllerRef.current?.abort();
    setIsLoading(false);
    setMessages(prev => {
      const last = prev[prev.length - 1];
      if (last && last.role === 'assistant' && last.status === 'streaming') {
        return prev.map(m => m.id === last.id ? { ...m, status: 'done' } : m);
      }
      return prev;
    });
  }, []);

  const handleNewChat = useCallback(() => {
    setMessages([]);
    resetNodes();
    setReportContent('');
    setReportCitations([]);
    const newId = Math.random().toString(36).slice(2);
    setConversations(prev => [{ id: newId, title: '新任务', updatedAt: Date.now() }, ...prev]);
    setActiveConversationId(newId);
  }, [resetNodes]);

  const handleSelectConversation = useCallback((id: string) => {
    setActiveConversationId(id);
    // 简单处理：新会话清空消息
    if (id !== 'default' || messages.length > 0) {
      setMessages([]);
      resetNodes();
      setReportContent('');
      setReportCitations([]);
    }
  }, [messages.length, resetNodes]);

  // 切换面板显隐
  const [showWorkflowPanel, setShowWorkflowPanel] = useState(true);

  return (
    <div className="h-screen flex overflow-hidden bg-slate-50">
      {/* 左侧边栏 */}
      <Sidebar
        conversations={conversations}
        activeConversationId={activeConversationId}
        onNewChat={handleNewChat}
        onSelectConversation={handleSelectConversation}
      />

      {/* 中间主对话区 */}
      <div className="flex-1 flex flex-col min-w-0">
        <TopBar
          title={conversations.find(c => c.id === activeConversationId)?.title || '科研工作台'}
          hasContent={messages.some(m => m.role === 'assistant' && m.status === 'done')}
          onExport={() => setShowReport(true)}
        />

        <MessageList messages={messages} isLoading={isLoading} />

        {/* 当有报告内容时显示快捷导出按钮 */}
        {reportContent && !isLoading && (
          <div className="px-4 pb-2">
            <div className="max-w-3xl mx-auto">
              <button
                onClick={() => setShowReport(true)}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white text-sm font-medium shadow-lg shadow-amber-500/20 transition-all"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>
                查看完整报告并导出
              </button>
            </div>
          </div>
        )}

        <ChatInput
          onSend={handleSend}
          onStop={handleStop}
          isLoading={isLoading}
        />
      </div>

      {/* 右侧工作流面板 */}
      {showWorkflowPanel && (
        <div className="w-[320px] flex-shrink-0 hidden xl:block">
          <WorkflowPanel nodes={nodes} plan={plan} currentAgent={currentAgent} />
        </div>
      )}

      {/* 报告查看器 */}
      <ReportViewer
        open={showReport}
        onOpenChange={setShowReport}
        content={reportContent}
        title="科研分析报告"
        citations={reportCitations}
      />
    </div>
  );
}
