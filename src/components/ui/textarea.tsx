import * as React from "react";
import { cn } from "../../lib/utils";

const Textarea = React.forwardRef<HTMLTextAreaElement, React.TextareaHTMLAttributes<HTMLTextAreaElement>>(
  ({ className, ...props }, ref) => (
    <textarea
      ref={ref}
      className={cn(
        "flex min-h-[52px] w-full resize-none rounded-[12px] border border-border bg-card/70 px-3 py-3 text-lg font-normal leading-relaxed tracking-tight text-foreground shadow-[0_1px_0_rgba(255,255,255,0.28)] transition-[border-color,box-shadow,background-color] duration-150 placeholder:text-muted-foreground/60 focus-visible:border-primary/45 focus-visible:bg-card focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50",
        className,
      )}
      {...props}
    />
  ),
);
Textarea.displayName = "Textarea";

export { Textarea };
