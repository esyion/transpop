import * as React from "react";
import { cn } from "../../lib/utils";

export interface SwitchProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "type"> {}

const Switch = React.forwardRef<HTMLInputElement, SwitchProps>(({ className, ...props }, ref) => (
  <label className={cn("relative inline-flex h-6 w-11 items-center", className)}>
    <input ref={ref} type="checkbox" className="peer sr-only" {...props} />
    <span className="absolute inset-0 rounded-full border border-border bg-muted transition-colors duration-150 peer-checked:border-primary/40 peer-checked:bg-primary/90" />
    <span className="absolute left-0.5 top-0.5 size-5 rounded-full bg-background shadow-sm transition-transform duration-150 peer-checked:translate-x-5" />
  </label>
));
Switch.displayName = "Switch";

export { Switch };
