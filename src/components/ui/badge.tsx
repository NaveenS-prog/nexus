import * as React from "react";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "default" | "secondary" | "destructive" | "outline" | "success" | "warning" | "cyan" | "olive" | "parchment" | "terracotta";
}

export function Badge({ className, variant = "default", ...props }: BadgeProps) {
  const variantStyles = {
    default: "bg-canvas-secondary text-ink border border-hairline",
    secondary: "bg-surface text-ink-secondary border border-hairline-subtle",
    destructive: "bg-terracotta-soft text-terracotta border border-terracotta-border font-medium",
    outline: "text-ink-secondary border border-hairline bg-transparent",
    success: "bg-olive-soft text-olive border border-olive-border font-medium",
    warning: "bg-terracotta-soft text-terracotta border border-terracotta-border",
    cyan: "bg-olive-soft text-olive border border-olive-border",
    olive: "bg-olive-soft text-olive border border-olive-border font-medium",
    parchment: "bg-canvas-secondary text-ink-secondary border border-hairline",
    terracotta: "bg-terracotta-soft text-terracotta border border-terracotta-border font-medium",
  };

  return (
    <div
      className={cn(
        "inline-flex items-center rounded-[4px] px-2 py-0.5 text-[11px] font-normal transition-colors focus:outline-none",
        variantStyles[variant],
        className
      )}
      {...props}
    />
  );
}
