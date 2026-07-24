import { getVersion } from "@tauri-apps/api/app";
import { relaunch } from "@tauri-apps/plugin-process";
import { check, type Update } from "@tauri-apps/plugin-updater";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { hasTauriRuntime } from "../../lib/runtime";

export type AppUpdateStatus =
  | "idle"
  | "checking"
  | "upToDate"
  | "available"
  | "downloading"
  | "installing"
  | "error";

export interface AppUpdaterController {
  currentVersion: string;
  availableVersion: string | null;
  releaseNotes: string | null;
  status: AppUpdateStatus;
  progress: number | null;
  error: string | null;
  checkForUpdates: (options?: { manual?: boolean }) => Promise<void>;
  installUpdate: () => Promise<void>;
}

interface AppUpdaterState {
  currentVersion: string;
  availableVersion: string | null;
  releaseNotes: string | null;
  status: AppUpdateStatus;
  progress: number | null;
  error: string | null;
}

const AUTO_CHECK_DELAY_MS = 3_000;
const UPDATE_TIMEOUT_MS = 30_000;

const INITIAL_STATE: AppUpdaterState = {
  currentVersion: "",
  availableVersion: null,
  releaseNotes: null,
  status: "idle",
  progress: null,
  error: null,
};

export function useAppUpdater(): AppUpdaterController {
  const [state, setState] = useState<AppUpdaterState>(INITIAL_STATE);
  const updateRef = useRef<Update | null>(null);
  const operationInProgressRef = useRef(false);

  useEffect(() => {
    if (!hasTauriRuntime()) return;

    void getVersion()
      .then((currentVersion) => {
        setState((current) => ({ ...current, currentVersion }));
      })
      .catch((cause) => {
        console.error("failed to read app version", cause);
      });
  }, []);

  const checkForUpdates = useCallback(
    async ({ manual = true }: { manual?: boolean } = {}) => {
      if (!hasTauriRuntime()) {
        const message = "仅桌面安装版支持检查更新";
        setState((current) => ({
          ...current,
          status: "error",
          error: message,
        }));
        if (manual) toast.error(message);
        return;
      }

      if (operationInProgressRef.current) return;
      operationInProgressRef.current = true;
      setState((current) => ({
        ...current,
        status: "checking",
        progress: null,
        error: null,
      }));

      try {
        if (updateRef.current) {
          await updateRef.current.close().catch(() => undefined);
          updateRef.current = null;
        }

        const update = await check({ timeout: UPDATE_TIMEOUT_MS });
        updateRef.current = update;

        if (!update) {
          setState((current) => ({
            ...current,
            status: "upToDate",
            availableVersion: null,
            releaseNotes: null,
            progress: null,
            error: null,
          }));
          if (manual) toast.success("当前已是最新版本");
          return;
        }

        setState((current) => ({
          ...current,
          currentVersion: update.currentVersion,
          availableVersion: update.version,
          releaseNotes: update.body?.trim() || null,
          status: "available",
          progress: null,
          error: null,
        }));
      } catch (cause) {
        const message = getErrorMessage(cause, "检查更新失败，请稍后重试");
        setState((current) => ({
          ...current,
          status: "error",
          progress: null,
          error: message,
        }));
        if (manual) toast.error(message);
        else console.error("automatic update check failed", cause);
      } finally {
        operationInProgressRef.current = false;
      }
    },
    [],
  );

  const installUpdate = useCallback(async () => {
    const update = updateRef.current;
    if (!update || operationInProgressRef.current) return;

    operationInProgressRef.current = true;
    let downloadedBytes = 0;
    let totalBytes: number | undefined;

    setState((current) => ({
      ...current,
      status: "downloading",
      progress: 0,
      error: null,
    }));

    try {
      await update.downloadAndInstall(
        (event) => {
          if (event.event === "Started") {
            downloadedBytes = 0;
            totalBytes = event.data.contentLength;
            setState((current) => ({
              ...current,
              status: "downloading",
              progress: totalBytes ? 0 : null,
            }));
            return;
          }

          if (event.event === "Progress") {
            downloadedBytes += event.data.chunkLength;
            if (!totalBytes) return;

            const progress = Math.min(
              100,
              Math.round((downloadedBytes / totalBytes) * 100),
            );
            setState((current) => ({ ...current, progress }));
            return;
          }

          setState((current) => ({
            ...current,
            status: "installing",
            progress: 100,
          }));
        },
      );

      setState((current) => ({
        ...current,
        status: "installing",
        progress: 100,
      }));
      toast.success("更新安装完成，正在重启应用");
      await relaunch();
    } catch (cause) {
      const message = getErrorMessage(cause, "更新安装失败，请稍后重试");
      setState((current) => ({
        ...current,
        status: "error",
        progress: null,
        error: message,
      }));
      toast.error(message);
      operationInProgressRef.current = false;
    }
  }, []);

  useEffect(() => {
    if (!hasTauriRuntime()) return;

    const timer = window.setTimeout(() => {
      void checkForUpdates({ manual: false });
    }, AUTO_CHECK_DELAY_MS);

    return () => window.clearTimeout(timer);
  }, [checkForUpdates]);

  useEffect(
    () => () => {
      if (updateRef.current && !operationInProgressRef.current) {
        void updateRef.current.close();
      }
    },
    [],
  );

  return {
    ...state,
    checkForUpdates,
    installUpdate,
  };
}

function getErrorMessage(cause: unknown, fallback: string): string {
  if (cause instanceof Error && cause.message.trim()) return cause.message;
  if (typeof cause === "string" && cause.trim()) return cause;
  return fallback;
}
