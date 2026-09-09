"use client";

import { Command as CommandIcon, History, Settings, X } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getLanguageHint, inferTargetLanguage } from "@/features/translation";
import { getLanguageLabel } from "@/lib/constants";
import type { ViewRoute } from "@/lib/routes";
import { useAppStore } from "@/stores/app-store";

type AppHeaderProps = {
  /** 当前视图路由。 */
  view: ViewRoute;
  /** 打开命令面板回调。 */
  onOpenCommandPalette: () => void;
};

/**
 * 应用顶栏：Logo、语言方向提示、全局快捷键徽标与页面导航。
 * 顶栏同时承担无边框窗口的拖拽区域。
 */
export function AppHeader({ view, onOpenCommandPalette }: AppHeaderProps) {
  const input = useAppStore((state) => state.input);
  const result = useAppStore((state) => state.result);
  const settings = useAppStore((state) => state.settings);
  const languageHint = getLanguageHint(result, input, settings);
  const { smartTargetLanguage, shortcut, shortcutEnabled } = settings;

  return (
    <header
      className="flex shrink-0 items-center justify-between gap-3 border-b px-4 py-2.5"
      data-tauri-drag-region
    >
      <Link
        href="/"
        className="flex min-w-0 items-center gap-2.5 rounded-md outline-none focus-visible:ring-2 focus-visible:ring-ring"
        aria-label="返回翻译"
      >
        <Image
          src="/logo.svg"
          width={32}
          height={32}
          alt=""
          aria-hidden="true"
          className="size-8"
        />
        <span className="flex min-w-0 flex-col items-start">
          <strong className="text-sm font-semibold leading-tight">TransPop</strong>
          <span className="max-w-52 truncate text-xs leading-tight text-muted-foreground">
            {languageHint}
          </span>
        </span>
      </Link>

      <div className="flex items-center gap-1.5">
        <Badge variant="secondary" className="hidden sm:inline-flex">
          {smartTargetLanguage
            ? "自动"
            : getLanguageLabel(inferTargetLanguage(input, settings))}
        </Badge>
        <Badge variant={shortcutEnabled ? "outline" : "secondary"}>
          {shortcutEnabled ? shortcut : "快捷键已关闭"}
        </Badge>
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={onOpenCommandPalette}
          aria-label="打开命令面板"
          title="命令面板"
        >
          <CommandIcon />
        </Button>
        <HeaderNavButton icon={<History />} label="翻译历史" active={view === "/history"} target="/history" />
        <HeaderNavButton icon={<Settings />} label="设置" active={view === "/settings"} target="/settings" />
      </div>
    </header>
  );
}

type HeaderNavButtonProps = {
  /** 按钮图标。 */
  icon: React.ReactNode;
  /** 无障碍名称。 */
  label: string;
  /** 是否处于当前页。 */
  active: boolean;
  /** 目标路由。 */
  target: ViewRoute;
};

/** 顶栏导航按钮：再次点击返回翻译页，图标随激活态切换。 */
function HeaderNavButton({ icon, label, active, target }: HeaderNavButtonProps) {
  const pathname = usePathname();
  const router = useRouter();

  return (
    <Button
      variant={active ? "secondary" : "ghost"}
      size="icon-sm"
      onClick={() => router.push(pathname === target ? "/" : target)}
      aria-label={active ? `关闭${label}` : `打开${label}`}
      title={label}
    >
      {active ? <X /> : icon}
    </Button>
  );
}
