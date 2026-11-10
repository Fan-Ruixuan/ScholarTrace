# AGENTS.md - 溯研·多智能体科研协作平台

## 项目概览

溯研是面向高校实验室的多智能体协作系统，基于 Coze 平台构建，通过自动化任务编排，帮助科研人员完成从「文献解析 → 数据处理 → 报告生成 → 合规校验」的完整科研工作链，并通过三层知识库+引用指针机制确保所有产出内容有据可查、可溯源。

## 版本技术栈

- **Framework**: Next.js 16 (App Router)
- **Core**: React 19
- **Language**: TypeScript 5
- **UI 组件**: shadcn/ui (基于 Radix UI)
- **Styling**: Tailwind CSS 4
- **Markdown渲染**: react-markdown + remark-gfm
- **后端集成**: Coze OpenAPI (Bot对话 + Workflow工作流)

## 目录结构

```
├── public/                      # 静态资源
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   ├── chat/route.ts        # 主对话流SSE接口 (POST)
│   │   │   └── workflow/run/route.ts # 子工作流执行接口 (GET/POST)
│   │   ├── globals.css              # 全局样式+主题色+动画
│   │   ├── layout.tsx               # 根布局
│   │   └── page.tsx                 # 主页面（三栏布局）
│   ├── components/
│   │   ├── ui/                      # Shadcn UI 组件库
│   │   ├── Sidebar.tsx              # 左侧边栏（导航+会话列表）
│   │   ├── TopBar.tsx               # 顶部栏（导出等操作）
│   │   ├── MessageList.tsx          # 消息列表（气泡+Markdown+引用）
│   │   ├── ChatInput.tsx            # 输入框（含快捷指令+文件上传）
│   │   ├── FileUpload.tsx           # 文件上传组件
│   │   ├── WorkflowPanel.tsx        # 右侧Agent编排状态可视化面板
│   │   └── ReportViewer.tsx         # 报告预览/导出弹窗
│   └── lib/
│       ├── types.ts                 # TypeScript类型定义
│       ├── utils.ts                 # 通用工具函数（cn）
│       ├── agent-config.ts          # Agent配置（颜色/图标/名称/描述）
│       └── coze-api.ts              # Coze API服务封装
├── .env.example                     # 环境变量示例
├── DESIGN.md                        # 设计规范文档
└── package.json
```

## 环境变量配置

在项目根目录创建 `.env.local` 文件，参考 `.env.example` 填入以下信息：

| 变量名 | 说明 | 获取方式 |
|--------|------|----------|
| `COZE_WORKLOAD_API_TOKEN` | Coze PAT 令牌 | https://www.coze.cn/open/oauth/pats |
| `COZE_BOT_ID` | 主对话流Bot ID | Coze平台Bot设置页 |
| `WORKFLOW_PARSE_ID` | 文献解析子工作流ID | Coze工作流发布后获取 |
| `WORKFLOW_DATA_ID` | 数据处理子工作流ID | 同上 |
| `WORKFLOW_REPORT_ID` | 报告生成子工作流ID | 同上 |
| `WORKFLOW_CHECK_ID` | 合规校验子工作流ID | 同上 |
| `COZE_PROJECT_SPACE_ID` | 团队空间ID | Coze空间URL中获取 |

⚠️ **重要**：如果API Token或Workflow ID未配置，前端会自动降级为**演示模式**，通过模拟Agent流转展示完整交互流程，便于UI预览。配置完成后自动切换为真实API调用。

## 构建与运行

```bash
# 安装依赖
pnpm install

# 开发模式（端口5000，支持HMR）
pnpm run dev

# 构建生产版本
pnpm run build

# 启动生产服务
pnpm run start
```

## 核心模块说明

### 1. 主对话流（Chat）
- **前端**: `ChatInput` + `MessageList` 组件
- **后端API**: `POST /api/chat` — SSE流式响应
- **对接Coze**: `v3/chat` 接口，stream模式
- **支持事件**: message.delta（文字流）、workflow.delta（工作流进度）、error、done

### 2. 四个专项工作流
- **前端**: `WorkflowPanel` 可视化节点状态
- **后端API**: `POST /api/workflow/run` — 支持流式/非流式
- **工作流映射**:
  - `parse` → 文献解析Agent（观点抽取、关键词聚类）
  - `data` → 数据处理Agent（清洗、标准化、异常标注）
  - `report` → 报告生成Agent（模板组装、引用指针生成）
  - `check` → 合规校验Agent（格式硬校验+逻辑软校验）
- **接口约定**: ID进/ID出 — Agent间通过数据库record_id传递指针，不直接传长文本

### 3. Agent编排可视化
右侧 `WorkflowPanel` 实时展示：
- 意图识别结果与执行计划（Plan）
- 每个Agent节点的状态（pending/running/done/error/retry）
- 并行/串行关系（连线+数据流动画）
- 进度条与执行日志
- 三层知识库（L1/L2/L3）状态指示

### 4. 引用溯源机制
- 消息中通过 `citation-mark` 上标样式展示引用标注
- 每条引用包含：文献名、页码、原文片段
- 报告末尾自动生成参考文献索引表
- 报告导出时保留完整引用信息

## 工作流联调说明

联调时需确保Coze平台侧：
1. **4个子工作流均已发布**（未发布无法通过API调用）
2. **主对话流Bot已绑定工作流**并开启文件上传
3. **知识库已配置**：L1原始库、L2结构化库、L3规则库
4. **数据库表已创建**：任务指针表 `suyan_task_record`、引用索引表 `suyan_citation`

### 接口契约

**主对话流输入**:
```json
{
  "message": "用户指令文本",
  "files": [{ "id": "file_id", "name": "文件名" }]
}
```

**SSE事件格式**:
```
event: message.delta
data: {"content": "增量文本"}

event: workflow.delta
data: {"nodeTitle": "文献解析Agent", "content": "正在解析..."}

event: done
data: {}
```

## 代码规范

- 严格 TypeScript strict 模式，禁止隐式 any
- 使用 'use client' 标记客户端组件，配合 useState/useEffect 避免 hydration 问题
- 所有API调用通过后端Route代理，不在前端直接暴露Token
- 流式输出统一使用SSE协议 + ReadableStream
- 遵循 DESIGN.md 中的设计规范：色彩、字体、间距、组件样式
