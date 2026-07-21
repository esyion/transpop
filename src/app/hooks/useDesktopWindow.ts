import { invoke } from "@tauri-apps/api/core";
import { useCallback, useEffect, useRef } from "react";
import type { RefObject } from "react";
import { hasTauriRuntime } from "../../lib/runtime";
import { useAppStore } from "../../store/appStore";

const MAX_FOCUS_ATTEMPTS = 24;

export function useDesktopWindow(
  inputRef: RefObject<HTMLTextAreaElement | null>,
) {
  const view = useAppStore((state) => state.view);
  const focusRequestRef = useRef(0);

  const focusInput = useCallback(() => {
    const requestId = focusRequestRef.current + 1;
    focusRequestRef.current = requestId;
    let attempts = 0;

    const focusWhenReady = () => {
      if (requestId !== focusRequestRef.current) return;

      if (inputRef.current) {
        inputRef.current.focus();
        return;
      }

      attempts += 1;
      if (attempts < MAX_FOCUS_ATTEMPTS) {
        window.requestAnimationFrame(focusWhenReady);
      }
    };

    focusWhenReady();
  }, [inputRef]);

  useEffect(() => {
    if (view === "translate") focusInput();
  }, [focusInput, view]);

  useEffect(
    () => () => {
      focusRequestRef.current += 1;
    },
    [],
  );

  useEffect(() => {
    if (!hasTauriRuntime()) return;

    let unlisten: (() => void) | undefined;

    void import("@tauri-apps/api/event").then(({ listen }) =>
      listen("transpop://focus-input", () => {
        useAppStore.getState().setView("translate");
        focusInput();
      }).then((handler) => {
        unlisten = handler;
      }),
    );

    return () => unlisten?.();
  }, [focusInput]);

  const hideWindow = useCallback(async (): Promise<void> => {
    if (hasTauriRuntime()) {
      await invoke("hide_main_window");
      return;
    }

    inputRef.current?.blur();
  }, [inputRef]);

  return { hideWindow };
}
