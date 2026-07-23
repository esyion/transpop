import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "../../lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-[10px] text-sm font-medium leading-normal tracking-normal transition-[opacity,transform,background-color,border-color,color,box-shadow] duration-100 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-45 active:translate-y-px",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground shadow-[0_7px_16px_color-mix(in_srgb,var(--primary)_20%,transparent)] hover:-translate-y-px hover:brightness-105",
        secondary: "border border-border bg-muted/75 text-foreground hover:bg-muted",
        ghost: "bg-transparent text-muted-foreground hover:bg-accent hover:text-foreground",
        outline: "border border-border bg-card/70 text-foreground shadow-[0_1px_0_rgba(255,255,255,0.32)] hover:border-primary/30 hover:bg-accent",
        accent: "border border-primary/15 bg-accent text-accent-foreground shadow-sm hover:bg-accent/80",
        destructive: "bg-destructive text-destructive-foreground shadow-sm hover:opacity-95",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-9 rounded-[10px] px-3 text-xs",
        lg: "h-11 rounded-[12px] px-5",
        icon: "size-10",
        iconSm: "size-9",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";

    return <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />;
  },
);
Button.displayName = "Button";

export { Button, buttonVariants };
