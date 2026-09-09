"use client";

import { CircleArrowUp, RefreshCw } from "lucide-react";

import { useAppUpdater } from "@/features/settings/hooks/use-app-updater";
import { SettingCard } from "@/features/settings/components/setting-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Progress } from "@/components/ui/progress";
import { Spinner } from "@/components/ui/spinner";

/** 判断更新流程是否处于进行中状态。 */
function isBusy(status: ReturnType<typeof useAppUpdater>["status"]): boolean {
  return status === "checking" || status === "downloading" || status === "installing";
}

/**
 * 「应用更新」设置卡片：当前版本展示、新版本提醒、下载进度与升级入口。
 */
export function UpdateGroup() {
  const updater = useAppUpdater();
  const busy = isBusy(updater.status);

  return (
    <SettingCard
      icon={<CircleArrowUp className="size-4" />}
      title="应用更新"
      description="检查并安装 TransPop 的新版本"
    >
      <FieldGroup className="gap-3">
        <Field orientation="horizontal">
          <FieldLabel className="font-normal">当前版本</FieldLabel>
          <Badge variant="outline">
            {updater.currentVersion ? `v${updater.currentVersion}` : "读取中…"}
          </Badge>
        </Field>

        {updater.status === "available" && updater.availableVersion ? (
          <div className="flex flex-col gap-2 rounded-lg border p-3">
            <div className="flex items-center justify-between gap-3">
              <span className="text-sm font-medium">发现新版本</span>
              <Badge>v{updater.availableVersion}</Badge>
            </div>
            {updater.releaseNotes ? (
              <p className="max-h-24 overflow-auto text-xs leading-5 whitespace-pre-wrap text-muted-foreground">
                {updater.releaseNotes}
              </p>
            ) : null}
          </div>
        ) : null}

        {updater.status === "downloading" || updater.status === "installing" ? (
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <Spinner className="size-3" />
                {updater.status === "installing" ? "正在安装更新…" : "正在下载更新…"}
              </span>
              <span>{updater.progress === null ? "" : `${updater.progress}%`}</span>
            </div>
            <Progress value={updater.progress ?? 10} aria-label="更新下载进度" />
          </div>
        ) : null}

        {updater.status === "error" && updater.error ? (
          <p role="alert" className="text-destructive text-xs">
            {updater.error}
          </p>
        ) : null}

        <Button
          variant={updater.status === "available" ? "default" : "outline"}
          disabled={busy}
          onClick={() => {
            if (updater.status === "available") {
              void updater.installUpdate();
            } else {
              void updater.checkForUpdates();
            }
          }}
        >
          {busy ? (
            <Spinner data-icon="inline-start" />
          ) : updater.status === "available" ? (
            <CircleArrowUp data-icon="inline-start" />
          ) : (
            <RefreshCw data-icon="inline-start" />
          )}
          {buttonLabel(updater.status)}
        </Button>
      </FieldGroup>
    </SettingCard>
  );
}

/** 按更新状态生成按钮文案。 */
function buttonLabel(status: ReturnType<typeof useAppUpdater>["status"]): string {
  switch (status) {
    case "available":
      return "立即升级";
    case "checking":
      return "正在检查…";
    case "downloading":
      return "正在下载…";
    case "installing":
      return "正在安装…";
    case "upToDate":
      return "重新检查";
    default:
      return "检查更新";
  }
}
