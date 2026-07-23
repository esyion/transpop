import type { ReactNode } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../../../components/ui/card";
import { Switch } from "../../../components/ui/switch";

interface SettingGroupProps {
  icon: ReactNode;
  title: string;
  description: string;
  children: ReactNode;
}

export function SettingGroup({
  icon,
  title,
  description,
  children,
}: SettingGroupProps) {
  return (
    <Card className="setting-card border-border/70">
      <CardHeader className="grid grid-cols-[32px_1fr] gap-3 pb-3">
        <span
          className="setting-icon grid size-8 place-items-center"
          aria-hidden="true"
        >
          {icon}
        </span>
        <div>
          <CardTitle>{title}</CardTitle>
          <CardDescription>{description}</CardDescription>
        </div>
      </CardHeader>
      <CardContent className="grid gap-3">{children}</CardContent>
    </Card>
  );
}

export function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="setting-field-label grid gap-1.5">
      {label}
      {children}
    </label>
  );
}

interface SwitchRowProps {
  label: string;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
}

export function SwitchRow({
  label,
  checked,
  onCheckedChange,
}: SwitchRowProps) {
  return (
    <label className="setting-row flex items-center justify-between gap-4 border border-border px-3 py-2.5">
      <span className="text-sm font-normal text-foreground">{label}</span>
      <Switch
        checked={checked}
        onChange={(event) => onCheckedChange(event.currentTarget.checked)}
      />
    </label>
  );
}
