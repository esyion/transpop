import type { Metadata, Viewport } from "next";

import { AppShell } from "@/layouts/app-shell";
import "@/app/globals.css";

export const metadata: Metadata = {
  title: "TransPop",
  description: "TransPop 是一款快捷、轻量的桌面翻译工具",
  icons: {
    icon: [{ url: "/favicon.svg", type: "image/svg+xml" }],
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#0a0a0a" },
  ],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh-CN" suppressHydrationWarning>
      <body className="antialiased">
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
