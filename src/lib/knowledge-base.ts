// 三层知识库的内容模型 —— 供左侧知识库详情抽屉使用
// L1 原始文献库（只读底账）/ L2 结构化知识库（主力调用）/ L3 规则校验库（质检依据）

export type KBLayer = 'L1' | 'L2' | 'L3';

export interface KBEntry {
  id: string;          // 文献ID / record_id / 规则编号
  title: string;
  meta: string;        // 类型·体量
  tag?: string;        // 状态标签
  excerpt: string;     // 详情正文
  fields?: { label: string; value: string }[];
}

export interface KBLayerMeta {
  label: string;
  fullName: string;
  purpose: string;
  policy: string;
  format: string;
}

export const KB_LAYER_META: Record<KBLayer, KBLayerMeta> = {
  L1: {
    label: '原始文献库',
    fullName: 'L1 原始文献库',
    purpose: '保存用户上传的文献与实验数据原文，作为一切结论的最终底账。',
    policy: '只读 · 不允许 Agent 改写，只能新增原文',
    format: 'PDF / CSV / XLSX · 按页码切片索引',
  },
  L2: {
    label: '结构化库',
    fullName: 'L2 结构化知识库',
    purpose: '存放解析后的观点、参数与数据记录，Agent 之间通过 record_id 指针调用。',
    policy: '可写 · 解析与数据 Agent 写入，报告 Agent 读取',
    format: 'JSON Record · 每条含 doc_id、page、观点、关键词',
  },
  L3: {
    label: '规则校验库',
    fullName: 'L3 规则校验库',
    purpose: '沉淀学术写作规范与合规校验规则，为校验 Agent 提供判断依据。',
    policy: '只读 · 仅管理员维护，校验时全量比对',
    format: '规则条目 · 硬性（代码校验）/ 软性（语义比对）',
  },
};

/** 各层存量内容（首次进入即有内容可看，不依赖是否跑过工作流） */
export const KB_ENTRIES: Record<KBLayer, KBEntry[]> = {
  L1: [
    {
      id: 'DOC-C01',
      title: '量子纠缠态规模化制备综述',
      meta: 'PDF · 17 页 · 2.4 MB',
      tag: '已解析',
      excerpt:
        '综述了离子阱、超导与光量子三条技术路线的纠缠态制备进展，指出离子阱阵列在相干时间上的优势，并给出容错量子计算的工程化路径判断。',
      fields: [
        { label: '切片数', value: '34 片' },
        { label: '入库时间', value: '2026-11-08 14:22' },
        { label: '下游记录', value: 'REC-P16-A594、REC-P22-A681' },
      ],
    },
    {
      id: 'DOC-C02',
      title: '随机线路采样与量子优势验证',
      meta: 'PDF · 52 页 · 6.1 MB',
      tag: '已解析',
      excerpt:
        '记录了 53 量子比特处理器在随机线路采样任务上的实验结果，与经典超算的对照数据及加速比测算方法。',
      fields: [
        { label: '切片数', value: '96 片' },
        { label: '入库时间', value: '2026-11-08 14:23' },
        { label: '下游记录', value: 'REC-P45-C102' },
      ],
    },
    {
      id: 'DOC-C03',
      title: '催化剂筛选中的量子模拟应用',
      meta: 'PDF · 83 页 · 9.7 MB',
      tag: '已解析',
      excerpt:
        '讨论量子模拟在过渡金属催化体系中的应用，给出筛选周期由数月压缩至数天的量化评估。',
      fields: [
        { label: '切片数', value: '151 片' },
        { label: '入库时间', value: '2026-11-09 09:40' },
        { label: '下游记录', value: 'REC-P78-C203' },
      ],
    },
    {
      id: 'DATA-D01',
      title: '钙钛矿电池效率实验数据',
      meta: 'CSV · 1,240 行 · 318 KB',
      tag: '已清洗',
      excerpt:
        '包含 12 组样品的效率、填充因子与衰减曲线原始测量值，存在 3 处量纲不一致与 1 处缺失值。',
      fields: [
        { label: '字段数', value: '9 列' },
        { label: '入库时间', value: '2026-11-09 10:05' },
        { label: '下游记录', value: 'REC-D01-0B0E' },
      ],
    },
  ],
  L2: [
    {
      id: 'REC-P16-A594',
      title: '离子阱阵列相干时间突破',
      meta: '结构化观点 · 来源 DOC-C01 p16',
      tag: '高置信',
      excerpt:
        '通过优化的离子阱阵列，可在室温环境维持超过设定阈值的相干时间，为容错量子计算奠定基础。',
      fields: [
        { label: '关键词', value: '离子阱 / 相干时间 / 容错' },
        { label: '置信度', value: '0.92' },
        { label: '写入者', value: '文献解析 Agent' },
      ],
    },
    {
      id: 'REC-P45-C102',
      title: '53 量子比特百万倍加速',
      meta: '结构化观点 · 来源 DOC-C02 p45',
      tag: '高置信',
      excerpt:
        '53 量子比特处理器在随机线路采样任务上相较经典超算实现百万倍加速，标志量子优势进入实用阶段。',
      fields: [
        { label: '关键词', value: '量子优势 / 随机线路采样' },
        { label: '置信度', value: '0.88' },
        { label: '写入者', value: '文献解析 Agent' },
      ],
    },
    {
      id: 'REC-P78-C203',
      title: '催化剂筛选周期压缩',
      meta: '结构化观点 · 来源 DOC-C03 p78',
      tag: '高置信',
      excerpt:
        '在材料模拟领域，量子计算有望将催化剂筛选周期从数月缩短至数天。',
      fields: [
        { label: '关键词', value: '量子模拟 / 催化剂 / 材料' },
        { label: '置信度', value: '0.85' },
        { label: '写入者', value: '文献解析 Agent' },
      ],
    },
    {
      id: 'REC-D01-0B0E',
      title: '钙钛矿效率数据清洗结果',
      meta: '数据记录 · 来源 DATA-D01',
      tag: '含异常',
      excerpt:
        '完成量纲统一与缺失值补全，自动标注 3 处效率异常点（超出同批次 3σ 区间）。',
      fields: [
        { label: '异常数', value: '3 处' },
        { label: '处理行数', value: '1,240 行' },
        { label: '写入者', value: '数据处理 Agent' },
      ],
    },
  ],
  L3: [
    {
      id: 'R-001',
      title: '引用格式硬性校验',
      meta: '硬性规则 · 代码节点执行',
      tag: '启用',
      excerpt:
        '每条结论后必须附带标准引用标记，格式为「【来源: doc_id=…, page=…】」，缺引用或页码为空即判定不通过。',
      fields: [
        { label: '校验方式', value: '正则匹配' },
        { label: '失败处理', value: '打回报告 Agent 重试' },
      ],
    },
    {
      id: 'R-002',
      title: '占位完整性校验',
      meta: '硬性规则 · 代码节点执行',
      tag: '启用',
      excerpt:
        '正文中禁止出现 TODO、待补充、xxx 等占位内容，出现即判定为未完成报告。',
      fields: [
        { label: '校验方式', value: '关键词黑名单' },
        { label: '失败处理', value: '打回重写' },
      ],
    },
    {
      id: 'R-003',
      title: '结论—来源语义一致性',
      meta: '软性规则 · 大模型比对',
      tag: '启用',
      excerpt:
        '将每条结论与引用切片做语义比对，判断结论是否被来源原文支撑，防止张冠李戴式引用。',
      fields: [
        { label: '校验方式', value: '语义相似度 + LLM 判定' },
        { label: '失败处理', value: '标注问题并打回' },
      ],
    },
    {
      id: 'R-004',
      title: '逻辑链完整性',
      meta: '软性规则 · 大模型比对',
      tag: '启用',
      excerpt:
        '检查结论之间是否存在跳跃，要求关键论断具备前置证据或推导过程。',
      fields: [
        { label: '校验方式', value: '结构化大纲比对' },
        { label: '失败处理', value: '提示补全论证' },
      ],
    },
    {
      id: 'R-005',
      title: '参考文献编号唯一',
      meta: '硬性规则 · 代码节点执行',
      tag: '启用',
      excerpt:
        '参考文献索引表编号必须唯一且连续，不允许重复或跳号。',
      fields: [
        { label: '校验方式', value: '集合去重检查' },
        { label: '失败处理', value: '自动重排并提示' },
      ],
    },
  ],
};
