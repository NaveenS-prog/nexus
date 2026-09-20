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
      default: "bg-white text-black font-semibold shadow hover:bg-zinc-200 transition-colors",
      secondary: "bg-zinc-900 text-zinc-100 hover:bg-zinc-800 border border-zinc-800",
      outline: "border border-zinc-700 bg-black text-zinc-200 hover:border-white hover:text-white",
      ghost: "hover:bg-zinc-800/60 text-zinc-400 hover:text-white",
      danger: "bg-zinc-900 text-white border border-zinc-700 hover:bg-zinc-800 hover:border-white",
      subtle: "bg-zinc-900/80 text-zinc-200 border border-zinc-800 hover:bg-zinc-800",
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
