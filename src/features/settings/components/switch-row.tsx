"use client";

import { Field, FieldLabel } from "@/components/ui/field";
import { Switch } from "@/components/ui/switch";
import { useId } from "react";

type SwitchRowProps = {
  /** 开关文案。 */
  label: string;
  /** 当前开关状态。 */
  checked: boolean;
  /** 开关切换回调。 */
  onCheckedChange: (checked: boolean) => void;
};

/**
 * 设置页通用开关行：label 与 switch 通过 id 关联，读屏可用。
 */
export function SwitchRow({ label, checked, onCheckedChange }: SwitchRowProps) {
  const id = useId();

  return (
    <Field orientation="horizontal">
      <FieldLabel htmlFor={id} className="font-normal">
        {label}
      </FieldLabel>
      <Switch id={id} checked={checked} onCheckedChange={onCheckedChange} />
    </Field>
  );
}
