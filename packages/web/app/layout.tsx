import type { Metadata } from "next";
import Link from "next/link";

import "./globals.css";

export const metadata: Metadata = {
  title: "ETF 回测",
  description: "个人研究用 ETF 日频回测平台",
};

const NAV = [
  { href: "/", label: "总览" },
  { href: "/etfs", label: "ETF" },
  { href: "/strategies", label: "策略" },
  { href: "/backtest/new", label: "新建回测" },
  { href: "/runs", label: "回测记录" },
  { href: "/compare", label: "对比" },
];

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN">
      <body>
        <header className="border-b border-neutral-200 bg-white">
          <div className="mx-auto flex h-14 max-w-6xl items-center gap-6 px-6">
            <Link href="/" className="text-sm font-semibold">
              ETF 回测
            </Link>
            <nav className="flex items-center gap-5 text-sm text-neutral-500">
              {NAV.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="transition-colors hover:text-neutral-900"
                >
                  {item.label}
                </Link>
              ))}
            </nav>
          </div>
        </header>
        <main className="mx-auto max-w-6xl px-6 py-8">{children}</main>
      </body>
    </html>
  );
}
