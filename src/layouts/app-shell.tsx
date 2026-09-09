"use client";

import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";

import { CommandPalette, useAppBootstrap } from "@/features/shell";
import type { CommandAction } from "@/features/shell";
import { TRANSLATE_INPUT_ID } from "@/features/translation";
import { AppHeader } from "@/layouts/app-header";
import { Toaster } from "@/components/ui/sonner";
import { toViewRoute } from "@/lib/routes";
import { hasTauriRuntime } from "@/lib/runtime";
import { onFocusInput } from "@/services/app-events";
import { hideMainWindow } from "@/services/window";
import { useAppStore } from "@/stores/app-store";

/** 等待翻译输入框挂载的最大重试帧数。 */
const MAX_FOCUS_ATTEMPTS = 16;

/**
 * 应用外壳：启动引导、全局快捷键、命令面板、页面路由与提示组件。
 * 作为根布局的客户端边界，负责跨页面的全局交互。
 */
export function AppShell({ children }: { children: React.ReactNode }) {
  useAppBootstrap();

  const router = useRouter();
  const pathname = usePathname();
  const [paletteOpen, setPaletteOpen] = useState(false);
  const paletteOpenRef = useRef(false);

  // ref 的同步放在 effect 中，避免渲染期间修改引用。
  useEffect(() => {
    paletteOpenRef.current = paletteOpen;
  }, [paletteOpen]);

  const settingsTheme = useAppStore((state) => state.settings.theme);

  const hideWindow = useCallback(async () => {
    if (hasTauriRuntime()) {
      await hideMainWindow();
      return;
    }
    // 浏览器开发模式没有窗口，仅让输入框失焦模拟关闭。
    document.getElementById(TRANSLATE_INPUT_ID)?.blur();
  }, []);

  // 全局快捷键：Ctrl/Cmd+K 命令面板、Esc 层级返回、Ctrl/Cmd+C 复制结果。
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setPaletteOpen(true);
        return;
      }

      if (event.key === "Escape") {
        event.preventDefault();
        if (paletteOpenRef.current) {
          setPaletteOpen(false);
          return;
        }
        if (pathname !== "/") {
          router.push("/");
          return;
        }
        void hideWindow();
        return;
      }

      if (
        (event.ctrlKey || event.metaKey) &&
        event.key.toLowerCase() === "c" &&
        useAppStore.getState().result?.result
      ) {
        const target = event.target as HTMLElement | null;
        const hasSelection = window.getSelection()?.toString();
        if (
          target?.tagName !== "TEXTAREA" &&
          target?.tagName !== "INPUT" &&
          !hasSelection
        ) {
          event.preventDefault();
          void useAppStore.getState().copyResult();
        }
      }
    };

    window.addEventListener("keydown", onKeyDown, true);
    return () => window.removeEventListener("keydown", onKeyDown, true);
  }, [hideWindow, pathname, router]);

  // 后端唤起窗口后广播事件：回到翻译页并聚焦输入框。
  useEffect(() => {
    let unlisten: (() => void) | undefined;
    let disposed = false;

    void onFocusInput(() => {
      router.push("/");
      focusTranslateInput();
    }).then((stop) => {
      if (disposed) stop();
      else unlisten = stop;
    });

    return () => {
      disposed = true;
      unlisten?.();
    };
  }, [router]);

  const executeCommand = useCallback(
    (action: CommandAction) => {
      setPaletteOpen(false);

      switch (action) {
        case "translate":
          if (pathname !== "/") {
            router.push("/");
            return;
          }
          void useAppStore.getState().runTranslate(undefined, true);
          return;
        case "copy":
          void useAppStore.getState().copyResult();
          return;
        case "retry":
          useAppStore.getState().retry();
          return;
        case "clear":
          useAppStore.getState().clearInput();
          return;
        case "history":
          router.push("/history");
          return;
        case "settings":
          router.push("/settings");
          return;
        case "translate-view":
          router.push("/");
      }
    },
    [pathname, router],
  );

  return (
    <main className="h-screen overflow-hidden p-1.5">
      <section
        className="mx-auto flex h-full w-full flex-col overflow-hidden rounded-xl border bg-card text-card-foreground shadow-lg animate-in fade-in zoom-in-95 slide-in-from-bottom-2 duration-300"
        aria-label="TransPop 翻译器"
      >
        <h1 className="sr-only">TransPop 翻译器</h1>
        <AppHeader view={toViewRoute(pathname)} onOpenCommandPalette={() => setPaletteOpen(true)} />
        <div className="min-h-0 flex-1 overflow-y-auto p-4">{children}</div>
        <footer className="flex shrink-0 flex-wrap items-center gap-x-4 gap-y-1 border-t px-4 py-1.5 text-xs text-muted-foreground">
          <span>输入后 1 秒自动翻译</span>
          <span>
            <kbd className="rounded border bg-muted px-1 font-mono text-[10px]">Enter</kbd> 立即翻译
          </span>
          <span>
            <kbd className="rounded border bg-muted px-1 font-mono text-[10px]">Esc</kbd> 关闭窗口
          </span>
          <span className="hidden sm:inline">
            <kbd className="rounded border bg-muted px-1 font-mono text-[10px]">Ctrl+K</kbd> 命令面板
          </span>
        </footer>
      </section>

      <CommandPalette open={paletteOpen} onOpenChange={setPaletteOpen} onExecute={executeCommand} />
      <Toaster theme={settingsTheme === "system" ? undefined : settingsTheme} />
    </main>
  );
}

/** 轮询等待翻译输入框挂载后聚焦（路由切换后 DOM 稍后才就绪）。 */
function focusTranslateInput() {
  let attempts = 0;
  const focusWhenReady = () => {
    const input = document.getElementById(TRANSLATE_INPUT_ID);
    if (input instanceof HTMLTextAreaElement) {
      input.focus();
      return;
    }
    attempts += 1;
    if (attempts < MAX_FOCUS_ATTEMPTS) {
      window.requestAnimationFrame(focusWhenReady);
    }
  };
  focusWhenReady();
}
