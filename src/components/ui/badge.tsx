import * as React from "react";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "default" | "secondary" | "destructive" | "outline" | "success" | "warning" | "cyan";
}

export function Badge({ className, variant = "default", ...props }: BadgeProps) {
  const variantStyles = {
    default: "border-transparent bg-indigo-500/15 text-indigo-400 border border-indigo-500/30",
    secondary: "border-transparent bg-white/[0.06] text-zinc-300 border border-white/[0.08]",
    destructive: "border-transparent bg-rose-500/15 text-rose-400 border border-rose-500/30",
    outline: "text-zinc-400 border border-white/[0.12]",
    success: "border-transparent bg-emerald-500/15 text-emerald-400 border border-emerald-500/30",
    warning: "border-transparent bg-amber-500/15 text-amber-400 border border-amber-500/30",
    cyan: "border-transparent bg-cyan-500/15 text-cyan-400 border border-cyan-500/30",
  };

  return (
    <div
      className={cn(
        "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
        variantStyles[variant],
        className
      )}
      {...props}
    />
  );
}
