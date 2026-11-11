import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';

/* ============================================================
   溯研 · 全功能自动演示录屏脚本（3~5 分钟版）
   - 使用系统 Edge（channel: msedge），无需额外下载浏览器
   - Playwright 录制视口视频（注入虚拟光标 + 点击水纹）
   - 输出：demo/_raw/*.webm（随后由 ffmpeg 转 mp4）
   ============================================================ */

const URL = 'http://localhost:5001';
const RAW = path.resolve('demo/_raw');
const SHOTS = path.resolve('demo/screens');
fs.mkdirSync(RAW, { recursive: true });
fs.mkdirSync(SHOTS, { recursive: true });

const steps = [];
const failures = [];
// Edge 通道在关闭上下文时偶发内部导航 Promise 拒绝（不影响录像），忽略该异常
process.on('unhandledRejection', (e) => {
  if (!/TargetClosedError|Target page, context or browser has been closed/.test(String(e))) {
    console.error('[unhandled]', e);
  }
});

const t0 = Date.now();
const stamp = () => `${((Date.now() - t0) / 1000).toFixed(1)}s`;

const browser = await chromium.launch({ channel: 'msedge', headless: true });
const context = await browser.newContext({
  viewport: { width: 1600, height: 900 },
  deviceScaleFactor: 1,
  locale: 'zh-CN',
  timezoneId: 'Asia/Shanghai',
  acceptDownloads: true,
  recordVideo: { dir: RAW, size: { width: 1600, height: 900 } },
});

// 注入虚拟光标与点击水纹（视频里可见，方便观众跟随操作）
await context.addInitScript(() => {
  const style = document.createElement('style');
  style.textContent = `
    nextjs-portal{display:none!important}
    .__demo-cursor{position:fixed;left:0;top:0;width:20px;height:20px;z-index:2147483647;pointer-events:none}
    .__demo-cursor svg{filter:drop-shadow(0 1px 3px rgba(20,24,30,.45))}
    .__demo-ripple{position:fixed;left:0;top:0;width:10px;height:10px;border-radius:50%;
      border:2px solid #3b5bdb;background:rgba(59,91,219,.16);z-index:2147483646;pointer-events:none;
      transform:translate(-50%,-50%);animation:__demo_rip .5s ease-out forwards}
    @keyframes __demo_rip{to{width:52px;height:52px;opacity:0}}
  `;
  const mount = () => {
    if (!document.body) return;
    document.head.appendChild(style);
    const cur = document.createElement('div');
    cur.className = '__demo-cursor';
    cur.innerHTML = '<svg width="20" height="20" viewBox="0 0 20 20"><path d="M3 2 L3 16.2 L7.2 12.6 L9.8 18.2 L12.3 17 L9.7 11.6 L15.4 11.6 Z" fill="#fff" stroke="#2b2f36" stroke-width="1.3" stroke-linejoin="round"/></svg>';
    document.body.appendChild(cur);
    window.addEventListener('mousemove', (e) => {
      cur.style.left = e.clientX + 'px';
      cur.style.top = e.clientY + 'px';
    }, true);
    window.addEventListener('mousedown', (e) => {
      const r = document.createElement('div');
      r.className = '__demo-ripple';
      r.style.left = e.clientX + 'px';
      r.style.top = e.clientY + 'px';
      document.body.appendChild(r);
      setTimeout(() => r.remove(), 520);
    }, true);
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mount);
  else mount();
});

const page = await context.newPage();
page.setDefaultTimeout(15000);
page.on('dialog', async d => { await page.waitForTimeout(500); await d.accept().catch(() => {}); });
const consoleErrors = [];
page.on('console', m => { if (m.type() === 'error') consoleErrors.push(m.text()); });
page.on('pageerror', e => consoleErrors.push(String(e)));

const wait = (ms) => page.waitForTimeout(ms);

async function run(name, fn, { optional = false } = {}) {
  try {
    await fn();
    steps.push({ step: name, at: stamp(), ok: true });
    console.log(`[OK] ${stamp()} ${name}`);
  } catch (e) {
    failures.push({ step: name, at: stamp(), error: String(e?.message || e) });
    console.log(`[FAIL] ${stamp()} ${name} :: ${e?.message || e}`);
    if (!optional) throw e;
  }
}

async function center(locator) {
  await locator.first().scrollIntoViewIfNeeded().catch(() => {});
  const box = await locator.first().boundingBox();
  if (!box) throw new Error('元素不可见，无法定位');
  return { x: box.x + box.width / 2, y: box.y + box.height / 2 };
}

async function glide(locator, { steps: n = 26, settle = 500 } = {}) {
  const { x, y } = await center(locator);
  await page.mouse.move(x, y, { steps: n });
  await wait(settle);
  return { x, y };
}

async function clickEl(locator, { after = 800, settle = 500 } = {}) {
  await glide(locator, { settle });
  await locator.first().click();
  await wait(after);
}

async function shot(name) {
  await page.screenshot({ path: path.join(SHOTS, name) });
}

/** 在回放滑块上按比例点击 */
async function clickSlider(frac) {
  const s = page.locator('.replay-slider');
  const b = await s.boundingBox();
  if (!b) throw new Error('回放滑块不可见');
  const x = b.x + b.width * frac;
  const y = b.y + b.height / 2;
  await page.mouse.move(x, y, { steps: 20 });
  await wait(500);
  await page.mouse.click(x, y);
  await wait(1400);
}

/* ------------------------- 开始演示 ------------------------- */
console.log('[RUN] 打开页面');
await page.goto(URL, { waitUntil: 'networkidle', timeout: 90000 });
await page.waitForSelector('.welcome', { timeout: 60000 });
await wait(1800);
await page.mouse.move(700, 260, { steps: 22 });
await wait(900);

await run('封面：逐条悬浮能力标签', async () => {
  for (const label of ['三层知识库', 'record_id 指针', '引用可溯源', '校验闭环']) {
    const tip = page.locator('.welcome-caps .tip', { hasText: label });
    await glide(tip, { steps: 20, settle: 1600 });
  }
  await glide(page.locator('.welcome h1'), { steps: 16, settle: 1100 });
});

await run('封面：快捷任务卡片悬浮', async () => {
  const cards = page.locator('.quick-card');
  for (let i = 0; i < await cards.count(); i++) {
    await glide(cards.nth(i), { steps: 18, settle: 1200 });
  }
  await shot('01-welcome.png');
});

await run('知识库：打开并浏览 L1 原始文献库', async () => {
  await clickEl(page.locator('.kb-layer', { hasText: '原始文献库' }), { after: 1600 });
  await page.waitForSelector('.kb-drawer-panel');
  await wait(1200);
  await clickEl(page.locator('.kb-entry-header').first(), { after: 2600 });
  await shot('02-kb-l1.png');
  await clickEl(page.locator('.kb-entry-header').nth(1), { after: 2600 });
  await clickEl(page.getByRole('button', { name: /访问记录/ }), { after: 2800 });
  await clickEl(page.locator('.kb-drawer-close'), { after: 1200 });
});

await run('知识库：浏览 L2 结构化库', async () => {
  await clickEl(page.locator('.kb-layer', { hasText: '结构化库' }), { after: 1600 });
  await wait(900);
  await clickEl(page.locator('.kb-entry-header').first(), { after: 2400 });
  await clickEl(page.locator('.kb-entry-header').nth(1), { after: 2000 });
  await clickEl(page.locator('.kb-drawer-close'), { after: 1000 });
});

await run('知识库：浏览 L3 规则校验库', async () => {
  await clickEl(page.locator('.kb-layer', { hasText: '规则校验库' }), { after: 1600 });
  await wait(900);
  await clickEl(page.locator('.kb-entry-header').first(), { after: 2400 });
  await clickEl(page.locator('.kb-drawer-close'), { after: 1000 });
});

await run('侧栏：重命名任务', async () => {
  const item = page.locator('.session-item', { hasText: '表面码纠错方案综述' });
  await glide(item, { settle: 900 });
  await clickEl(item.locator('.session-action-btn[title="重命名"]'), { after: 700 });
  const input = page.locator('.session-edit-input');
  await input.click();
  await page.keyboard.press('Control+A');
  await page.keyboard.type('表面码纠错方案对比研究', { delay: 90 });
  await wait(800);
  await page.keyboard.press('Enter');
  await wait(1200);
});

await run('侧栏：在分组内新建任务', async () => {
  const group = page.locator('.sidebar-group', { hasText: '量子计算方向' });
  await clickEl(group.locator('.group-action-btn[title="新建任务在此分组"]'), { after: 1600 });
  await page.waitForSelector('.welcome');
  await wait(1000);
});

await run('侧栏：分组折叠与展开', async () => {
  const head = page.locator('.sidebar-group', { hasText: '量子计算方向' }).locator('.group-header-left');
  await clickEl(head, { after: 1600 });
  await clickEl(head, { after: 1600 });
});

await run('侧栏：重命名课题分组', async () => {
  const group = page.locator('.sidebar-group', { hasText: '材料科学' });
  await glide(group, { settle: 800 });
  await clickEl(group.locator('.group-action-btn').nth(1), { after: 900 });
  await clickEl(page.locator('.group-more-menu div', { hasText: '重命名分组' }), { after: 900 });
  const input = page.locator('.group-edit-input');
  await input.click();
  await page.keyboard.press('Control+A');
  await page.keyboard.type('材料与器件', { delay: 90 });
  await wait(600);
  await page.keyboard.press('Enter');
  await wait(1200);
});

await run('侧栏：新建课题分组', async () => {
  await clickEl(page.locator('.add-group-btn'), { after: 800 });
  const input = page.locator('.add-group-input');
  await input.click();
  await page.keyboard.type('光学表征与器件', { delay: 90 });
  await wait(700);
  await page.keyboard.press('Enter');
  await wait(1600);
});

await run('侧栏：搜索任务', async () => {
  const search = page.locator('.sidebar-search-input');
  await clickEl(search, { after: 300 });
  await page.keyboard.type('量子', { delay: 120 });
  await wait(2200);
  await page.keyboard.press('Control+A');
  await page.keyboard.press('Backspace');
  await wait(1200);
});

await run('对话：拖拽上传提示层', async () => {
  await page.evaluate(() => {
    const box = document.querySelector('.input-box');
    const dt = new DataTransfer();
    dt.items.add(new File(['demo'], '拖拽上传示例.pdf', { type: 'application/pdf' }));
    box.dispatchEvent(new DragEvent('dragover', { bubbles: true, cancelable: true, dataTransfer: dt }));
  });
  await wait(2600);
  await shot('03a-drag.png');
  await page.evaluate(() => {
    const box = document.querySelector('.input-box');
    const dt = new DataTransfer();
    dt.items.add(new File(['demo'], '拖拽上传示例.pdf', { type: 'application/pdf' }));
    box.dispatchEvent(new DragEvent('drop', { bubbles: true, cancelable: true, dataTransfer: dt }));
  });
  await wait(1800);
});

await run('对话：选择文件上传并移除', async () => {
  await page.setInputFiles('input[type=file]', [
    path.resolve('demo/assets/量子纠错综述.pdf'),
    path.resolve('demo/assets/实验数据_量子比特.csv'),
  ]);
  await wait(2200);
  const chips = page.locator('.file-chip');
  await glide(chips.first(), { settle: 1200 });
  await clickEl(page.locator('.file-chip-remove').first(), { after: 1600 });
  await wait(800);
});

await run('对话：快捷指令填入需求并发送', async () => {
  await clickEl(page.locator('.quick-btn', { hasText: '解析文献' }), { after: 1600 });
  await shot('03-input.png');
  await clickEl(page.getByRole('button', { name: '发送' }), { after: 1200 });
  await page.waitForSelector('.topo-status.done', { timeout: 90000 });
  await wait(3200);
  await shot('04-parse-done.png');
});

await run('阅读：查看回答与引用标注', async () => {
  await glide(page.locator('.message-bubble.agent').first(), { steps: 22, settle: 2000 });
  await glide(page.locator('.topo-panel .topo-section').nth(1), { steps: 24, settle: 2200 });
});

await run('对话：新建任务并触发完整工作流', async () => {
  await clickEl(page.locator('.new-task-btn'), { after: 1600 });
  await page.waitForSelector('.welcome');
  await wait(900);
  await clickEl(page.locator('.quick-card', { hasText: '报告生成' }), { after: 1600 });
  await wait(1600);
  await shot('05-running.png');
  await page.waitForSelector('.topo-status.done', { timeout: 120000 });
  await wait(3200);
  await shot('06-done.png');
});

await run('溯源：点击引用标注查看原文片段', async () => {
  const marks = page.locator('.citation-mark');
  await marks.first().waitFor({ timeout: 20000 });
  await clickEl(marks.first(), { after: 1800 });
  await page.waitForSelector('.citation-popup', { timeout: 10000 });
  await wait(3200);
  await shot('07-citation.png');
  await page.mouse.click(1000, 150);
  await wait(1200);
});

await run('溯源：展开参考文献列表', async () => {
  await clickEl(page.locator('.ref-toggle').first(), { after: 2600 });
});

await run('右栏：执行计划折叠与展开', async () => {
  const planTitle = page.locator('.topo-section-title', { hasText: '执行计划' });
  await clickEl(planTitle, { after: 1800 });
  await clickEl(planTitle, { after: 1800 });
});

await run('右栏：滚动查看五层架构与执行日志', async () => {
  await page.mouse.move(1400, 620, { steps: 20 });
  await wait(600);
  await page.mouse.wheel(0, 420);
  await wait(3000);
  await shot('08-architecture.png');
  await page.mouse.wheel(0, 260);
  await wait(2600);
  await shot('09-logs.png');
  await page.mouse.wheel(0, -760);
  await wait(1500);
});

await run('右栏：时间轴回放（播放全过程）', async () => {
  await clickEl(page.getByRole('button', { name: '回放' }), { after: 1400 });
  await clickEl(page.locator('.replay-btn.primary'), { after: 800 });
  await wait(9200);
  await shot('10-replay.png');
});

await run('右栏：拖动回放滑块查看中间状态', async () => {
  await clickSlider(0.3);
  await clickSlider(0.68);
  await clickSlider(0.95);
  await wait(600);
  await clickEl(page.locator('button', { hasText: '退出' }), { after: 1200 });
});

await run('导出：报告预览与下载 Markdown', async () => {
  await clickEl(page.getByRole('button', { name: '导出报告' }), { after: 1600 });
  await page.waitForSelector('.report-modal', { timeout: 10000 });
  await wait(2000);
  await shot('11-report.png');
  await page.locator('.report-modal-body').evaluate(el => el.scrollBy(0, 400));
  await wait(2200);
  await page.locator('.report-modal-body').evaluate(el => el.scrollBy(0, 400));
  await wait(2000);
  const [download] = await Promise.all([
    page.waitForEvent('download', { timeout: 20000 }),
    page.locator('.report-download-btn').click(),
  ]);
  const dlDir = path.resolve('demo/_downloads');
  fs.mkdirSync(dlDir, { recursive: true });
  await download.saveAs(path.join(dlDir, '溯研报告.md'));
  await wait(1600);
  await clickEl(page.locator('.report-close-btn'), { after: 1200 });
});

await run('知识库：运行后 L2 已写入本次记录', async () => {
  await clickEl(page.locator('.kb-layer', { hasText: '结构化库' }), { after: 1600 });
  await wait(1200);
  await clickEl(page.locator('.kb-entry-header').first(), { after: 3200 });
  await shot('12-kb-l2.png');
  await clickEl(page.getByRole('button', { name: /访问记录/ }), { after: 3200 });
  await shot('13-kb-access.png');
  await clickEl(page.locator('.kb-drawer-close'), { after: 1200 });
});

await run('收尾：全景展示', async () => {
  await glide(page.locator('.topo-panel'), { steps: 26, settle: 2200 });
  await page.mouse.move(1180, 600, { steps: 20 });
  await wait(1400);
  await glide(page.locator('.mode-chip'), { steps: 20, settle: 2000 });
  await page.mouse.move(760, 700, { steps: 22 });
  await wait(2200);
});

/* ------------------------- 收尾 ------------------------- */
const video = page.video();
const rawPath = video ? await video.path().catch(() => null) : null;
await context.close().catch(e => console.log('[warn] context.close:', e?.message));
await new Promise(r => setTimeout(r, 1200));
const webmOut = path.resolve('demo/溯研功能演示.webm');
if (rawPath && fs.existsSync(rawPath)) fs.copyFileSync(rawPath, webmOut);
else console.log('[warn] 未找到原始录像', rawPath);
await browser.close().catch(() => {});

const summary = {
  url: URL,
  recordedAt: new Date().toISOString(),
  durationHintSeconds: Number(((Date.now() - t0) / 1000).toFixed(1)),
  steps,
  failures,
  consoleErrors: consoleErrors.slice(0, 20),
  webm: webmOut,
};
fs.writeFileSync(path.resolve('demo/_raw/summary.json'), JSON.stringify(summary, null, 2));
console.log('SUMMARY', JSON.stringify(summary.failures, null, 2));
console.log('VIDEO', webmOut);
