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
    default: "bg-zinc-950 text-white font-medium border border-zinc-900 shadow-xs",
    secondary: "bg-zinc-100 text-zinc-800 border border-zinc-200",
    destructive: "bg-red-50 text-red-700 border border-red-200 font-medium",
    outline: "text-zinc-700 border border-zinc-200 bg-white",
    success: "bg-emerald-50 text-emerald-800 border border-emerald-200 font-medium",
    warning: "bg-amber-50 text-amber-800 border border-amber-200 font-medium",
    cyan: "bg-cyan-50 text-cyan-800 border border-cyan-200 font-medium",
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
