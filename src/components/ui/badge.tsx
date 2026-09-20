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
    default: "bg-white text-black font-semibold border border-white",
    secondary: "bg-zinc-900 text-zinc-200 border border-zinc-700",
    destructive: "bg-black text-white border border-white font-semibold",
    outline: "text-zinc-300 border border-zinc-700 bg-zinc-950",
    success: "bg-zinc-100 text-black border border-white font-medium",
    warning: "bg-zinc-800 text-zinc-100 border border-zinc-600 font-medium",
    cyan: "bg-zinc-900 text-zinc-200 border border-zinc-700",
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
