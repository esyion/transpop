"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { ReactNode } from "react";

type SettingCardProps = {
  /** 卡片标题图标。 */
  icon: ReactNode;
  /** 卡片标题。 */
  title: string;
  /** 卡片说明。 */
  description: string;
  /** 卡片内容。 */
  children: ReactNode;
};

/**
 * 设置页通用卡片外壳：图标 + 标题 + 说明 + 内容区。
 */
export function SettingCard({ icon, title, description, children }: SettingCardProps) {
  return (
    <Card className="gap-3 py-4">
      <CardHeader className="px-4">
        <CardTitle className="flex items-center gap-2 text-sm">
          <span aria-hidden="true" className="grid size-7 place-items-center rounded-md bg-muted text-muted-foreground">
            {icon}
          </span>
          {title}
        </CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="px-4">{children}</CardContent>
    </Card>
  );
}
