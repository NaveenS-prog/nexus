import * as React from "react";
import { cn } from "./badge";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "default" | "olive" | "secondary" | "outline" | "ghost" | "danger" | "subtle";
  size?: "default" | "sm" | "lg" | "icon";
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "default", size = "default", ...props }, ref) => {
    const baseStyles =
      "inline-flex items-center justify-center whitespace-nowrap rounded-sm text-xs font-medium transition-all focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-olive disabled:pointer-events-none disabled:opacity-50 active:scale-[0.99]";

    const variantStyles = {
      default: "bg-ink text-surface hover:bg-[#2A2A2A] shadow-subtle",
      olive: "bg-olive text-white hover:bg-olive-hover shadow-subtle",
      secondary: "bg-canvas-secondary text-ink hover:bg-[#E5E1D8] border border-hairline",
      outline: "border border-hairline bg-surface text-ink hover:bg-canvas-secondary",
      ghost: "text-ink-secondary hover:text-ink hover:bg-canvas-secondary/70",
      danger: "bg-terracotta-soft text-terracotta border border-terracotta-border hover:bg-[#F3E5D8]",
      subtle: "bg-surface text-ink-secondary hover:text-ink border border-hairline-subtle",
    };

    const sizeStyles = {
      default: "h-8 px-3.5 py-1.5",
      sm: "h-7 rounded-[4px] px-2.5 text-[11px]",
      lg: "h-10 rounded-md px-5 text-sm",
      icon: "h-8 w-8 rounded-sm p-0",
    };

    return (
      <button
        ref={ref}
        className={cn(baseStyles, variantStyles[variant], sizeStyles[size], className)}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";
