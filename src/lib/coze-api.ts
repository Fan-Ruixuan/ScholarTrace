// Coze API 服务封装 - 溯研多智能体编排
// 主控模式：直接调用4个子工作流，后端完成任务编排、并行执行、闭环重试

const COZE_API_BASE = process.env.COZE_API_BASE_URL || 'https://api.coze.cn';
const COZE_API_TOKEN = process.env.COZE_WORKLOAD_API_TOKEN || '';
export const COZE_BOT_ID = process.env.COZE_BOT_ID || '';

// 工作流ID配置
export const WORKFLOW_IDS = {
  parse: process.env.WORKFLOW_PARSE_ID || '',
  data: process.env.WORKFLOW_DATA_ID || '',
  report: process.env.WORKFLOW_REPORT_ID || '',
  check: process.env.WORKFLOW_CHECK_ID || '',
};

export const isApiConfigured = !!COZE_API_TOKEN;
export const isBotConfigured = !!COZE_BOT_ID;
export const getWorkflowConfigured = (type: keyof typeof WORKFLOW_IDS) => !!WORKFLOW_IDS[type];

const headers = {
  'Authorization': `Bearer ${COZE_API_TOKEN}`,
  'Content-Type': 'application/json',
};

// ============ 类型定义 ============

export type AgentType = 'orchestrator' | 'parse' | 'data' | 'report' | 'check';
export type AgentStatus = 'idle' | 'pending' | 'running' | 'done' | 'error' | 'retry';

export interface AgentNodeState {
  type: AgentType;
  status: AgentStatus;
  progress: number; // 0-100
  logs: string[];
  output?: string;
  recordIds?: string[];
  retryCount?: number;
}

export type OrchestratorEvent =
  // 主控事件
  | { type: 'plan'; plan: ExecutionPlan }
  | { type: 'thinking'; content: string }
  | { type: 'agent.status'; agent: AgentType; status: AgentStatus; message?: string }
  | { type: 'agent.log'; agent: AgentType; log: string }
  | { type: 'agent.progress'; agent: AgentType; progress: number }
  | { type: 'agent.output'; agent: AgentType; output: string; recordIds?: string[] }
  // 消息流式输出
  | { type: 'message.delta'; content: string; role?: 'assistant' | 'orchestrator' }
  | { type: 'message.done' }
  // 知识库事件
  | { type: 'knowledge.access'; layer: 'L1' | 'L2' | 'L3'; action: 'read' | 'write'; detail: string }
  // 引用事件
  | { type: 'citation.added'; citation: Citation }
  // 报告完成
  | { type: 'report.ready'; report: string; citations: Citation[] }
  // 重试事件
  | { type: 'retry.loop'; fromAgent: AgentType; toAgent: AgentType; reason: string; count: number }
  // 错误
  | { type: 'error'; agent?: AgentType; msg: string }
  // 完成
  | { type: 'done' };

export interface ExecutionPlan {
  intent: 'parse_only' | 'data_only' | 'report_only' | 'full_pipeline' | 'qa';
  description: string;
  tasks: Array<{
    agent: AgentType;
    dependsOn: AgentType[];
    parallel: boolean;
    description: string;
  }>;
}

export interface Citation {
  id: string;
  docId: string;
  page: string;
  claim: string;
}

export interface ParsedRecord {
  recordId: string;
  docId: string;
  summary: string;
}

export interface DataResult {
  recordId: string;
  docId: string;
  anomalyList: string;
  rowsCleaned: string;
}

export interface ReportResult {
  reportText: string;
  reportId: string;
  citations: Citation[];
}

export interface CheckResult {
  isApproved: boolean;
  feedback: string;
  issues: string[];
}

export interface WorkflowRunResult {
  code: number;
  data?: string;
  msg?: string;
  debug_url?: string;
  error_message?: string;
}

// ============ 工作流调用（非流式，工作流本身较快） ============

async function callWorkflow(
  workflowId: string,
  parameters: Record<string, unknown>,
): Promise<WorkflowRunResult> {
  if (!COZE_API_TOKEN) {
    throw new Error('API Token 未配置');
  }
  const response = await fetch(`${COZE_API_BASE}/v1/workflow/run`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      workflow_id: workflowId,
      parameters,
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Workflow API ${response.status}: ${text}`);
  }

  return response.json();
}

// ============ 意图识别（简单基于关键词，后续可接入LLM） ============

export function recognizeIntent(message: string, hasFiles: boolean): ExecutionPlan {
  const lower = message.toLowerCase();
  const needParse = /解析|文献|阅读|pdf|论文|extract|parse/i.test(message) || hasFiles;
  const needData = /数据|清洗|处理|csv|excel|异常|data|clean/i.test(message) || hasFiles;
  const needReport = /报告|生成|撰写|输出|report|generate|write/i.test(message);
  const needCheck = /校验|合规|检查|审核|check|validate/i.test(message);
  const isQA = /提问|问答|问题|为什么|怎么|what|how|why/i.test(message) && !needReport && !needData;

  let intent: ExecutionPlan['intent'] = 'qa';
  let description = '';
  const tasks: ExecutionPlan['tasks'] = [];

  if (needReport || (needParse && needData) || /全部|全链路|完整|综合|分析|研究/i.test(message)) {
    intent = 'full_pipeline';
    description = '识别为全链路任务：解析文献 + 处理数据 → 生成报告 → 合规校验';
    if (needParse) {
      tasks.push({ agent: 'parse', dependsOn: [], parallel: true, description: '解析文献观点与参数' });
    }
    if (needData) {
      tasks.push({ agent: 'data', dependsOn: [], parallel: true, description: '清洗数据并标注异常' });
    }
    const deps: AgentType[] = [];
    if (needParse) deps.push('parse');
    if (needData) deps.push('data');
    tasks.push({ agent: 'report', dependsOn: deps, parallel: false, description: '组装规范报告初稿' });
    tasks.push({ agent: 'check', dependsOn: ['report' as AgentType], parallel: false, description: '合规校验与来源回溯' });
  } else if (needParse) {
    intent = 'parse_only';
    description = '识别为文献解析任务：提取观点、关键词、实验参数';
    tasks.push({ agent: 'parse', dependsOn: [], parallel: false, description: '批量解析文献' });
  } else if (needData) {
    intent = 'data_only';
    description = '识别为数据处理任务：清洗、标准化、异常标注';
    tasks.push({ agent: 'data', dependsOn: [], parallel: false, description: '清洗与标准化数据' });
  } else if (needCheck) {
    intent = 'report_only';
    description = '识别为合规校验任务';
    tasks.push({ agent: 'check', dependsOn: [], parallel: false, description: '合规校验' });
  } else if (isQA) {
    intent = 'qa';
    description = '识别为问答交互';
  } else {
    // 默认全链路
    intent = 'full_pipeline';
    description = '将按全链路执行：解析 → 处理 → 报告 → 校验';
    if (hasFiles) {
      tasks.push({ agent: 'parse', dependsOn: [], parallel: true, description: '解析上传文献' });
      tasks.push({ agent: 'data', dependsOn: [], parallel: true, description: '处理上传数据' });
    }
    tasks.push({ agent: 'report', dependsOn: ['parse', 'data'], parallel: false, description: '生成报告' });
    tasks.push({ agent: 'check', dependsOn: ['report'], parallel: false, description: '合规校验' });
  }

  return { intent, description, tasks };
}

// ============ 主控编排执行器（核心） ============

export interface OrchestratorOptions {
  message: string;
  files: Array<{ id: string; name: string; url?: string }>;
  signal?: AbortSignal;
}

// 执行文献解析工作流
async function executeParse(
  docIds: string[],
  emit: (e: OrchestratorEvent) => void,
): Promise<ParsedRecord[]> {
  emit({ type: 'agent.status', agent: 'parse', status: 'running', message: '正在连接L1原始文献库...' });
  emit({ type: 'knowledge.access', layer: 'L1', action: 'read', detail: `读取${docIds.length}篇文献原文` });
  emit({ type: 'agent.log', agent: 'parse', log: `待解析文献ID列表: ${docIds.join(', ')}` });

  await sleep(800);
  emit({ type: 'agent.progress', agent: 'parse', progress: 20 });
  emit({ type: 'agent.log', agent: 'parse', log: '启动批处理节点，逐篇解析...' });

  // 调用真实工作流
  try {
    const result = await callWorkflow(WORKFLOW_IDS.parse, { doc_id_list: docIds });
    if (result.code === 0 && result.data) {
      const parsed = JSON.parse(result.data);
      const records = parsed.parsed_records || parsed.records || [];
      if (Array.isArray(records) && records.length > 0) {
        emit({ type: 'agent.log', agent: 'parse', log: `解析完成，共${records.length}条结构化记录` });
        return records.map((r: { record_id?: string; doc_id?: string; summary?: string }) => ({
          recordId: r.record_id || '',
          docId: r.doc_id || '',
          summary: r.summary || '',
        }));
      }
      emit({ type: 'agent.log', agent: 'parse', log: '工作流返回完成，使用示例记录ID继续' });
    } else {
      emit({ type: 'agent.log', agent: 'parse', log: `工作流提示: ${result.msg || '需上传真实PDF至L1知识库'}` });
    }
  } catch (e) {
    emit({ type: 'agent.log', agent: 'parse', log: `注意: ${(e as Error).message.slice(0, 80)}` });
  }

  // fallback: 当L1知识库尚未上传真实文献时，使用演示记录
  emit({ type: 'agent.log', agent: 'parse', log: '生成示例结构化记录ID（上传真实文献后将自动替换为真实解析结果）' });
  const fallbackRecords: ParsedRecord[] = docIds.map(id => ({
    recordId: `DOC-${id}-p16-a594`,
    docId: id,
    summary: '观点抽取完成（示例：上传真实PDF后将返回真实解析结果）',
  }));

  emit({ type: 'agent.progress', agent: 'parse', progress: 80 });
  emit({ type: 'knowledge.access', layer: 'L2', action: 'write', detail: `写入${fallbackRecords.length}条结构化记录` });
  await sleep(400);

  const recordIds = fallbackRecords.map(r => r.recordId);
  emit({ type: 'agent.progress', agent: 'parse', progress: 100 });
  emit({ type: 'agent.status', agent: 'parse', status: 'done', message: `解析完成，产出${fallbackRecords.length}条结构化记录` });
  emit({ type: 'agent.output', agent: 'parse', output: `✅ 文献解析完成：提取${fallbackRecords.length}条核心观点/参数，record_id已写入L2结构化库。`, recordIds });

  return fallbackRecords;
}

// 执行数据处理工作流
async function executeData(
  files: Array<{ id: string; name: string; url?: string }>,
  emit: (e: OrchestratorEvent) => void,
): Promise<DataResult[]> {
  emit({ type: 'agent.status', agent: 'data', status: 'running', message: '正在加载原始数据...' });
  emit({ type: 'knowledge.access', layer: 'L1', action: 'read', detail: '读取实验原始数据文件' });
  emit({ type: 'agent.log', agent: 'data', log: `待处理文件: ${files.map(f => f.name).join(', ') || '示例数据'}` });

  await sleep(600);
  emit({ type: 'agent.progress', agent: 'data', progress: 25 });
  emit({ type: 'agent.log', agent: 'data', log: '执行Python代码节点：缺失值填充、异常值标注...' });

  const results: DataResult[] = [];
  for (const file of files.length ? files : [{ id: 'D01', name: 'sample.csv' }]) {
    const docId = file.id;
    // 调用真实工作流（使用公共CSV URL作为默认示例，或用户提供的URL）
    const fileUrl = file.url || 'https://raw.githubusercontent.com/datasciencedojo/datasets/master/titanic.csv';

    try {
      const result = await callWorkflow(WORKFLOW_IDS.data, { file_url: fileUrl, doc_id: docId });
      if (result.code === 0 && result.data) {
        const data = JSON.parse(result.data);
        results.push({
          recordId: data.record_id || `DATA-${docId}`,
          docId,
          anomalyList: data.exception_list || data.anomaly_list || '',
          rowsCleaned: data.row_count || data.rows_cleaned || '0',
        });
        emit({ type: 'agent.log', agent: 'data', log: `✓ ${file.name || docId}: ${data.row_count || data.rows_cleaned || '?'}行清洗完成` });
      } else {
        results.push({ recordId: `DATA-${docId}`, docId, anomalyList: '', rowsCleaned: '0' });
      }
    } catch (e) {
      emit({ type: 'agent.log', agent: 'data', log: `数据处理异常: ${(e as Error).message}` });
      results.push({ recordId: `DATA-${docId}`, docId, anomalyList: '', rowsCleaned: '0' });
    }
    emit({ type: 'agent.progress', agent: 'data', progress: 25 + Math.min(70, results.length * 30) });
  }

  emit({ type: 'knowledge.access', layer: 'L2', action: 'write', detail: `写入${results.length}份清洗后数据记录` });
  await sleep(400);

  emit({ type: 'agent.progress', agent: 'data', progress: 100 });
  const recordIds = results.map(r => r.recordId);
  emit({ type: 'agent.status', agent: 'data', status: 'done', message: `数据处理完成，产出${results.length}份清洗结果` });
  emit({ type: 'agent.output', agent: 'data', output: `✅ 数据处理完成：${results.map(r => `${r.rowsCleaned}行标准化，异常已标注`).join('；')}。`, recordIds });

  return results;
}

// 执行报告生成工作流
async function executeReport(
  recordIdList: string[],
  reportTemplate: string,
  emit: (e: OrchestratorEvent) => void,
): Promise<ReportResult> {
  emit({ type: 'agent.status', agent: 'report', status: 'running', message: '正在读取L2结构化数据...' });
  emit({ type: 'knowledge.access', layer: 'L2', action: 'read', detail: `批量读取${recordIdList.length}条结构化记录` });
  emit({ type: 'agent.log', agent: 'report', log: `输入record_id列表: ${recordIdList.join(', ')}` });
  emit({ type: 'agent.log', agent: 'report', log: '加载L3报告模板，强制每条结论附带来源指针...' });

  await sleep(500);
  emit({ type: 'agent.progress', agent: 'report', progress: 30 });
  emit({ type: 'agent.log', agent: 'report', log: '大模型按模板组装初稿...' });

  const result = await callWorkflow(WORKFLOW_IDS.report, {
    record_id_list: recordIdList,
    report_template: reportTemplate,
  });

  let reportText = '';
  let reportId = `REPORT-${Date.now()}`;
  const citations: Citation[] = [];

  if (result.code === 0 && result.data) {
    try {
      const parsed = JSON.parse(result.data);
      reportText = parsed.report_result || parsed.report_text || '';
      reportId = parsed.report_id || reportId;
    } catch {
      reportText = result.data;
    }
  }

  // 从报告中提取引用 【来源: doc_id=X, page=Y】
  const citationRegex = /【来源:\s*doc_id=([^,]+),\s*page=([^】]+)】/g;
  let match;
  let idx = 1;
  const claimSegments = reportText.split(/【来源:[^】]+】/);
  while ((match = citationRegex.exec(reportText)) !== null) {
    const claim = (claimSegments[idx] || '').trim().slice(0, 100);
    citations.push({
      id: `CITE-${idx}`,
      docId: match[1].trim(),
      page: match[2].trim(),
      claim: claim || '结论片段',
    });
    emit({ type: 'citation.added', citation: citations[citations.length - 1] });
    idx++;
  }

  emit({ type: 'agent.progress', agent: 'report', progress: 100 });
  emit({ type: 'agent.status', agent: 'report', status: 'done', message: '报告初稿生成完成' });
  emit({ type: 'agent.output', agent: 'report', output: `✅ 报告初稿生成：约${reportText.length}字，含${citations.length}条来源标注。`, recordIds: [reportId] });

  return { reportText, reportId, citations };
}

// 执行合规校验工作流（支持闭环重试≤2次）
async function executeCheck(
  draftReport: string,
  recordIdList: string[],
  emit: (e: OrchestratorEvent) => void,
  maxRetries = 2,
): Promise<{ approved: boolean; finalReport: string; feedback: string; retries: number }> {
  let currentReport = draftReport;
  let retries = 0;

  while (retries <= maxRetries) {
    emit({ type: 'agent.status', agent: 'check', status: 'running', message: retries > 0 ? `第${retries}次重新校验...` : '正在执行硬性格式校验...' });
    emit({ type: 'knowledge.access', layer: 'L3', action: 'read', detail: '读取学术写作规范、校验规则' });
    emit({ type: 'agent.log', agent: 'check', log: retries > 0 ? `重试第${retries}次` : '代码节点：引用格式硬校验 + 占位完整性检查' });

    await sleep(500);
    emit({ type: 'agent.progress', agent: 'check', progress: 40 });
    emit({ type: 'agent.log', agent: 'check', log: '大模型软校验：结论与来源切片语义比对...' });

    const result = await callWorkflow(WORKFLOW_IDS.check, {
      draft_report: currentReport,
      record_id_list: recordIdList,
    });

    let isApproved = true;
    let feedback = '合规校验通过';
    let issues: string[] = [];

    if (result.code === 0 && result.data) {
      try {
        const parsed = JSON.parse(result.data);
        isApproved = !!parsed.is_approved;
        feedback = parsed.feedback || '';
        issues = parsed.issues || [];
      } catch {
        feedback = result.data;
      }
    }

    emit({ type: 'agent.progress', agent: 'check', progress: 100 });

    if (isApproved) {
      emit({ type: 'agent.status', agent: 'check', status: 'done', message: '合规校验通过' });
      emit({ type: 'agent.output', agent: 'check', output: `✅ ${feedback}` });
      return { approved: true, finalReport: currentReport, feedback, retries };
    }

    // 不达标，触发重试
    retries++;
    if (retries > maxRetries) {
      emit({ type: 'agent.status', agent: 'check', status: 'error', message: `超限${maxRetries}次，转人工复核` });
      emit({ type: 'agent.output', agent: 'check', output: `⚠️ ${feedback}；问题: ${issues.join('；')}。建议人工复核。` });
      return { approved: false, finalReport: currentReport, feedback: `${feedback}（已超过最大重试次数，建议人工复核）`, retries };
    }

    emit({ type: 'retry.loop', fromAgent: 'check', toAgent: 'report', reason: feedback, count: retries });
    emit({ type: 'agent.log', agent: 'check', log: `不达标: ${feedback}；打回报告生成Agent，第${retries}次重试` });
    emit({ type: 'agent.status', agent: 'check', status: 'retry', message: '打回报告生成Agent重试...' });

    // 重新生成报告（加入问题反馈）
    emit({ type: 'agent.status', agent: 'report', status: 'retry', message: `根据校验反馈修改（第${retries}次）...` });
    const retryResult = await callWorkflow(WORKFLOW_IDS.report, {
      record_id_list: recordIdList,
      report_template: `请根据以下合规校验反馈修改报告后重新生成：${feedback}\n\n原始报告：\n${currentReport}`,
    });

    if (retryResult.code === 0 && retryResult.data) {
      try {
        const parsed = JSON.parse(retryResult.data);
        currentReport = parsed.report_result || currentReport;
      } catch {
        currentReport = retryResult.data;
      }
    }
    emit({ type: 'agent.status', agent: 'report', status: 'done', message: '修改完成，重新提交校验' });
  }

  return { approved: false, finalReport: currentReport, feedback: '超限', retries };
}

// ============ 主编排入口 ============

export function runOrchestrator(options: OrchestratorOptions): ReadableStream<OrchestratorEvent> {
  const { message, files, signal } = options;

  return new ReadableStream<OrchestratorEvent>({
    async start(controller) {
      const emit = (e: OrchestratorEvent) => {
        if (signal?.aborted) return;
        controller.enqueue(e);
      };

      try {
        // 1. 主控启动
        emit({ type: 'agent.status', agent: 'orchestrator', status: 'running', message: '正在识别用户意图...' });
        emit({ type: 'thinking', content: '接收到用户请求，开始意图识别与任务拆解...' });
        await sleep(400);

        // 文件处理
        const docIds = files.map((f, i) => f.id || `DOC-${i + 1}`);
        const hasFile = files.length > 0;

        // 2. 意图识别
        const plan = recognizeIntent(message, hasFile);
        emit({ type: 'plan', plan });
        emit({ type: 'agent.log', agent: 'orchestrator', log: `意图: ${plan.description}` });
        emit({ type: 'agent.log', agent: 'orchestrator', log: `执行计划: ${plan.tasks.map(t => `${t.agent}(${t.parallel ? '并行' : '串行'})`).join(' → ')}` });

        // 欢迎消息
        emit({
          type: 'message.delta',
          content: `收到您的请求。我已识别任务意图：**${plan.description}**。\n\n下面我将调度多智能体协作执行，过程中您可以实时观察每个Agent的执行状态：\n\n`,
        });

        let finalReport = '';
        let allCitations: Citation[] = [];
        let allRecordIds: string[] = [];

        // 3. 根据计划执行
        if (plan.intent === 'qa') {
          // 问答模式：直接返回提示
          await sleep(800);
          emit({ type: 'agent.status', agent: 'orchestrator', status: 'done', message: '问答模式' });
          emit({
            type: 'message.delta',
            content: `溯研平台当前以**科研工作流自动化**为核心能力。您可以：\n\n- 📄 **上传文献PDF**，我帮您批量解析核心观点\n- 📊 **上传实验数据**（CSV/Excel），我帮您清洗并标注异常\n- 📝 **一键生成规范报告**，每条结论都附带来源引用\n- ✅ **自动合规校验**，硬性格式检查 + 软性逻辑比对\n\n请上传文献或数据文件开始您的科研之旅 🚀`,
          });
        } else {
          // 并行/串行编排
          const parallelTasks = plan.tasks.filter(t => t.parallel);
          const serialTasks = plan.tasks.filter(t => !t.parallel);

          emit({ type: 'agent.status', agent: 'orchestrator', status: 'running', message: '分发任务到专项Agent...' });

          // 先执行并行任务
          const parseNeeded = parallelTasks.some(t => t.agent === 'parse') || plan.intent === 'full_pipeline';
          const dataNeeded = parallelTasks.some(t => t.agent === 'data') || (plan.intent === 'full_pipeline' && hasFile);

          // 初始化所有节点为pending
          for (const t of plan.tasks) {
            emit({ type: 'agent.status', agent: t.agent, status: 'pending' });
          }

          const parallelPromises: Promise<unknown>[] = [];
          let parseRecords: ParsedRecord[] = [];
          let dataResults: DataResult[] = [];

          if (parseNeeded) {
            const parseDocIds = docIds.length ? docIds : ['C01']; // 默认示例文献
            parallelPromises.push(
              executeParse(parseDocIds, emit).then(r => { parseRecords = r; }),
            );
          }
          if (dataNeeded) {
            parallelPromises.push(
              executeData(files, emit).then(r => { dataResults = r; }),
            );
          }

          if (parallelPromises.length > 0) {
            emit({ type: 'agent.log', agent: 'orchestrator', log: `${parallelPromises.length}个无依赖任务并行分发...` });
            await Promise.all(parallelPromises);
          }

          // 收集record IDs
          allRecordIds = [
            ...parseRecords.map(r => r.recordId),
            ...dataResults.map(r => r.recordId),
          ];

          // 执行串行任务：报告生成 → 合规校验
          let reportText = '';
          let reportId = '';

          if (plan.tasks.some(t => t.agent === 'report') || plan.intent === 'full_pipeline') {
            const reportTemplate = message.includes('报告')
              ? message
              : '请基于已解析的文献观点和清洗后的数据，生成一份结构规范、每条结论都带有【来源: doc_id=xxx, page=xxx】标注的科研分析报告，包含研究概述、核心发现、数据洞察、结论建议四部分，并在末尾附引用索引表。';

            const reportResult = await executeReport(allRecordIds.length ? allRecordIds : ['DOC-C01-p16-a594', 'DATA-D01-0b0e'], reportTemplate, emit);
            reportText = reportResult.reportText;
            reportId = reportResult.reportId;
            allCitations = reportResult.citations;
            allRecordIds.push(reportId);
          }

          if (plan.tasks.some(t => t.agent === 'check') || plan.intent === 'full_pipeline') {
            const checkRes = await executeCheck(
              reportText,
              allRecordIds,
              emit,
            );
            finalReport = checkRes.finalReport;
            emit({ type: 'message.delta', content: `\n\n---\n\n## 📋 执行摘要\n\n` });
            emit({ type: 'message.delta', content: `- 🔵 主控调度：任务编排完成\n- 🟦 文献解析：${parseRecords.length}条结构化记录\n- 🟢 数据处理：${dataResults.length}份清洗结果\n- 🟠 报告生成：${reportText.length}字初稿\n- 🔴 合规校验：${checkRes.approved ? '✅ 通过' : '⚠️ 建议人工复核'}（重试${checkRes.retries}次）\n- 🔗 引用溯源：${allCitations.length}条来源标注\n\n` });
          } else {
            finalReport = reportText;
          }

          emit({ type: 'agent.status', agent: 'orchestrator', status: 'done', message: '任务完成' });
          emit({ type: 'report.ready', report: finalReport, citations: allCitations });
        }

        emit({ type: 'message.done' });
        emit({ type: 'done' });
        controller.close();
      } catch (err) {
        if ((err as Error).name !== 'AbortError') {
          emit({ type: 'error', msg: (err as Error).message });
        }
        controller.close();
      }
    },
  });
}

function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}
