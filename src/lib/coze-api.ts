// Coze API 服务封装 - Bot对话与Workflow调用
// 文档参考: /skills/public/prod/coze-asset-runner

const COZE_API_BASE = process.env.COZE_API_BASE_URL || 'https://api.coze.cn';
const COZE_API_TOKEN = process.env.COZE_WORKLOAD_API_TOKEN || '';
const COZE_BOT_ID = process.env.COZE_BOT_ID || '7572136020375916603';

const headers = {
  'Authorization': `Bearer ${COZE_API_TOKEN}`,
  'Content-Type': 'application/json',
};

export interface ChatStreamOptions {
  message: string;
  conversationId?: string;
  userId?: string;
  files?: Array<{ id: string; name: string }>;
  onEvent?: (event: ChatEvent) => void;
  signal?: AbortSignal;
}

export type ChatEvent =
  | { type: 'conversation.created'; conversationId: string }
  | { type: 'message.start'; messageId: string }
  | { type: 'message.delta'; content: string; reasoningContent?: string }
  | { type: 'message.done' }
  | { type: 'workflow.start'; workflowId: string; workflowName?: string }
  | { type: 'workflow.delta'; nodeTitle: string; content: string }
  | { type: 'workflow.done'; workflowId: string }
  | { type: 'error'; code: number; msg: string }
  | { type: 'done' };

/**
 * 流式对话 - 主对话流
 */
export async function streamChat(options: ChatStreamOptions): Promise<ReadableStream<ChatEvent>> {
  const { message, conversationId, userId = 'user_default', files } = options;

  // 构建消息附加信息
  let query = message;
  if (files && files.length > 0) {
    const fileList = files.map(f => `- ${f.name}`).join('\n');
    query = `${message}\n\n[已上传文件]\n${fileList}`;
  }

  const body: Record<string, unknown> = {
    bot_id: COZE_BOT_ID,
    user_id: userId,
    stream: true,
    auto_save_history: true,
    additional_messages: [
      {
        role: 'user',
        content: query,
        content_type: 'text',
      },
    ],
  };

  if (conversationId) {
    body.conversation_id = conversationId;
  }

  const response = await fetch(`${COZE_API_BASE}/v3/chat`, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
    signal: options.signal,
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Chat API error ${response.status}: ${errorText}`);
  }

  const reader = response.body?.getReader();
  if (!reader) {
    throw new Error('No response body');
  }

  return new ReadableStream<ChatEvent>({
    async start(controller) {
      const decoder = new TextDecoder();
      let buffer = '';
      let currentEvent = '';
      let currentConversationId = conversationId || '';

      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';

          for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed) continue;

            if (trimmed.startsWith('event:')) {
              currentEvent = trimmed.slice(6).trim();
            } else if (trimmed.startsWith('data:')) {
              const dataStr = trimmed.slice(5).trim();
              if (dataStr === '[DONE]') {
                controller.enqueue({ type: 'done' });
                controller.close();
                return;
              }

              try {
                const data = JSON.parse(dataStr);

                // 处理SSE事件
                switch (currentEvent) {
                  case 'conversation.chat.created':
                    if (data.id && !currentConversationId) {
                      currentConversationId = data.conversation_id || data.id;
                      controller.enqueue({ type: 'conversation.created', conversationId: currentConversationId });
                    }
                    break;

                  case 'conversation.message.delta':
                    if (data.role === 'assistant') {
                      if (data.type === 'reasoning_content' && data.reasoning_content) {
                        controller.enqueue({ type: 'message.delta', content: '', reasoningContent: data.reasoning_content });
                      } else if (data.type === 'answer' && data.content) {
                        controller.enqueue({ type: 'message.delta', content: data.content });
                      }
                    }
                    break;

                  case 'conversation.message.completed':
                    if (data.role === 'assistant' && data.type === 'answer') {
                      controller.enqueue({ type: 'message.done' });
                    }
                    break;

                  case 'conversation.chat.completed':
                    controller.enqueue({ type: 'done' });
                    break;

                  case 'conversation.chat.failed':
                    controller.enqueue({ type: 'error', code: data.last_error?.code || 500, msg: data.last_error?.msg || '对话失败' });
                    break;

                  case 'conversation.audit_progress':
                    // 工作流进度事件
                    if (data.node_title || data.node_name) {
                      const nodeTitle = data.node_title || data.node_name;
                      const content = data.content || data.msg || '';
                      controller.enqueue({ type: 'workflow.delta', nodeTitle, content });
                    }
                    break;

                  default:
                    // 尝试处理其他可能的进度事件
                    if (data.node_seq_id && data.node_name) {
                      controller.enqueue({ type: 'workflow.delta', nodeTitle: data.node_name, content: data.content || '' });
                    }
                    break;
                }
              } catch {
                // 忽略JSON解析错误
              }
            }
          }
        }
        controller.enqueue({ type: 'done' });
        controller.close();
      } catch (err) {
        if ((err as Error).name !== 'AbortError') {
          controller.enqueue({ type: 'error', code: 0, msg: (err as Error).message });
        }
        controller.close();
      }
    },
  });
}

/**
 * 执行单个子工作流 (4个专项Agent对应子工作流)
 */
export async function runWorkflow(
  workflowId: string,
  parameters: Record<string, unknown>,
  onEvent?: (event: WorkflowEvent) => void,
  signal?: AbortSignal,
): Promise<WorkflowResult> {
  const response = await fetch(`${COZE_API_BASE}/v1/workflow/stream_run`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      workflow_id: workflowId,
      parameters,
    }),
    signal,
  });

  if (!response.ok) {
    throw new Error(`Workflow API error ${response.status}`);
  }

  const reader = response.body?.getReader();
  if (!reader) throw new Error('No response body');

  const decoder = new TextDecoder();
  let buffer = '';
  let result: WorkflowResult = { output: '', success: false };

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || !trimmed.startsWith('data:')) continue;
        const dataStr = trimmed.slice(5).trim();
        if (dataStr === '[DONE]') break;
        try {
          const event = JSON.parse(dataStr);
          if (event.error_code) {
            result = { output: '', success: false, error: event.error_message };
            onEvent?.({ type: 'error', msg: event.error_message });
            return result;
          }
          if (event.content) {
            onEvent?.({ type: 'delta', content: event.content });
          }
          if (event.type === 'Message' && event.content) {
            result.output += event.content;
            onEvent?.({ type: 'delta', content: event.content });
          }
          if (event.type === 'Done') {
            result.success = true;
            onEvent?.({ type: 'done', output: result.output });
          }
          if (event.type === 'Error') {
            result.success = false;
            result.error = event.error_message;
            onEvent?.({ type: 'error', msg: event.error_message });
          }
        } catch {
          // ignore
        }
      }
    }
  } catch (err) {
    result = { output: '', success: false, error: (err as Error).message };
  }
  return result;
}

export interface WorkflowEvent {
  type: 'delta' | 'done' | 'error';
  content?: string;
  output?: string;
  msg?: string;
}

export interface WorkflowResult {
  output: string;
  success: boolean;
  error?: string;
}

/**
 * 上传文件到Coze
 */
export async function uploadFile(file: File): Promise<{ fileId: string }> {
  const formData = new FormData();
  formData.append('file', file);

  const response = await fetch(`${COZE_API_BASE}/v1/files/upload`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${COZE_API_TOKEN}`,
    },
    body: formData,
  });

  if (!response.ok) {
    throw new Error(`Upload failed: ${response.status}`);
  }

  const data = await response.json();
  return { fileId: data.data?.id || data.id };
}
