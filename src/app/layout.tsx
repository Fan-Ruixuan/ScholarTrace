import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: {
    default: '溯研 · 多智能体科研协作平台',
    template: '%s | 溯研',
  },
  description:
    '溯研是面向高校实验室的多智能体协作系统，通过自动化任务编排，帮助科研人员完成从文献解析、数据处理到规范报告生成的完整工作链，确保所有产出内容有据可查。',
  keywords: [
    '溯研',
    '多智能体',
    '科研协作',
    '文献解析',
    '数据处理',
    '报告生成',
    'AI科研',
    '学术写作',
  ],
  authors: [{ name: '溯研团队' }],
  generator: 'Coze Code',
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}
