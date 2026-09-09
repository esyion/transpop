"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Command as CommandIcon,
  History,
  Settings,
  X,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getLanguageLabel } from "@/lib/constants";
import { getLanguageHint, inferTargetLanguage } from "@/lib/language";
import type { ViewRoute } from "@/types/translation";
import { useAppStore } from "@/store/app-store";

interface AppHeaderProps {
  view: ViewRoute;
  onOpenCommandPalette: () => void;
}

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
          <strong className="text-sm leading-tight font-semibold">
            TransPop
          </strong>
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
        <HeaderNavButton
          icon={<History />}
          label="翻译历史"
          active={view === "/history"}
          target="/history"
        />
        <HeaderNavButton
          icon={<Settings />}
          label="设置"
          active={view === "/settings"}
          target="/settings"
        />
      </div>
    </header>
  );
}

function HeaderNavButton({
  icon,
  label,
  active,
  target,
}: {
  icon: React.ReactNode;
  label: string;
  active: boolean;
  target: ViewRoute;
}) {
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
