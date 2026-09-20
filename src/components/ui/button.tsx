import * as React from "react";
import { cn } from "./badge";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "default" | "secondary" | "outline" | "ghost" | "danger" | "subtle";
  size?: "default" | "sm" | "lg" | "icon";
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "default", size = "default", ...props }, ref) => {
    const baseStyles =
      "inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium transition-all focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 active:scale-[0.98]";

    const variantStyles = {
      default: "bg-indigo-600 text-white shadow hover:bg-indigo-500 hover:shadow-indigo-500/20",
      secondary: "bg-white/[0.07] text-zinc-100 hover:bg-white/[0.12] border border-white/[0.08]",
      outline: "border border-white/[0.12] bg-transparent hover:bg-white/[0.05] text-zinc-200",
      ghost: "hover:bg-white/[0.06] text-zinc-400 hover:text-zinc-100",
      danger: "bg-rose-600/20 text-rose-300 border border-rose-500/30 hover:bg-rose-600/30",
      subtle: "bg-indigo-950/40 text-indigo-300 border border-indigo-500/20 hover:bg-indigo-950/70",
    };

    const sizeStyles = {
      default: "h-9 px-4 py-2",
      sm: "h-7 rounded px-2.5 text-xs",
      lg: "h-10 rounded-md px-6 text-base",
      icon: "h-8 w-8 rounded-md p-0",
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
