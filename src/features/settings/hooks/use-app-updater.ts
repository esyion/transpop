"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import {
  checkForUpdate,
  discardUpdate,
  downloadAndInstallUpdate,
  getCurrentVersion,
  relaunchApp,
} from "@/services/updater";

/** 更新检查状态。 */
export type AppUpdateStatus =
  | "idle"
  | "checking"
  | "upToDate"
  | "available"
  | "downloading"
  | "installing"
  | "error";

/** 更新控制器：视图只消费该接口，不直接接触更新插件。 */
export type AppUpdaterController = {
  currentVersion: string;
  availableVersion: string | null;
  releaseNotes: string | null;
  status: AppUpdateStatus;
  /** 下载进度百分比；非下载中为 null。 */
  progress: number | null;
  error: string | null;
  checkForUpdates: () => Promise<void>;
  installUpdate: () => Promise<void>;
};

type AppUpdaterState = {
  currentVersion: string;
  availableVersion: string | null;
  releaseNotes: string | null;
  status: AppUpdateStatus;
  progress: number | null;
  error: string | null;
};

/** 更新检查请求超时（毫秒）。 */
const CHECK_TIMEOUT_MS = 30_000;

const INITIAL_STATE: AppUpdaterState = {
  currentVersion: "",
  availableVersion: null,
  releaseNotes: null,
  status: "idle",
  progress: null,
  error: null,
};

/** 稳定错误文案：检查失败。 */
const CHECK_FAILED_MESSAGE = "检查更新失败，请稍后重试";
/** 稳定错误文案：安装失败。 */
const INSTALL_FAILED_MESSAGE = "安装更新失败，请稍后重试";

/**
 * 应用更新控制器：检查、下载、安装与版本号展示。
 * 浏览器开发模式下检查动作会提示「仅桌面安装版支持」。
 */
export function useAppUpdater(): AppUpdaterController {
  const [state, setState] = useState<AppUpdaterState>(INITIAL_STATE);
  const updateRef = useRef<Awaited<ReturnType<typeof checkForUpdate>>>(null);
  const operationInProgress = useRef(false);

  // 启动时读取当前版本号用于展示（不自动检查更新）。
  useEffect(() => {
    void getCurrentVersion()
      .then((currentVersion) => {
        setState((current) => ({ ...current, currentVersion }));
      })
      .catch((cause) => console.error("failed to read app version", cause));
  }, []);

  const checkForUpdates = useCallback(async () => {
    if (operationInProgress.current) return;
    operationInProgress.current = true;
    setState((current) => ({
      ...current,
      status: "checking",
      progress: null,
      error: null,
    }));

    try {
      await discardUpdate(updateRef.current);
      updateRef.current = null;

      const update = await checkForUpdate(CHECK_TIMEOUT_MS);
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
        toast.success("当前已是最新版本");
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
      console.error("update check failed", cause);
      setState((current) => ({
        ...current,
        status: "error",
        progress: null,
        error: CHECK_FAILED_MESSAGE,
      }));
    } finally {
      operationInProgress.current = false;
    }
  }, []);

  const installUpdate = useCallback(async () => {
    const update = updateRef.current;
    if (!update || operationInProgress.current) return;

    operationInProgress.current = true;
    setState((current) => ({
      ...current,
      status: "downloading",
      progress: 0,
      error: null,
    }));

    try {
      await downloadAndInstallUpdate(update, (percent) => {
        setState((current) => ({
          ...current,
          status: percent >= 100 ? "installing" : "downloading",
          progress: Number.isNaN(percent) ? null : percent,
        }));
      });
      await relaunchApp();
    } catch (cause) {
      console.error("update install failed", cause);
      setState((current) => ({ ...current, status: "error", error: INSTALL_FAILED_MESSAGE }));
    } finally {
      operationInProgress.current = false;
    }
  }, []);

  return { ...state, checkForUpdates, installUpdate };
}
