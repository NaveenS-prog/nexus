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
      default: "bg-zinc-950 text-white font-semibold shadow-sm hover:bg-zinc-800 transition-all",
      secondary: "bg-zinc-100 text-zinc-900 hover:bg-zinc-200/80 border border-zinc-200 font-medium",
      outline: "border border-zinc-200 bg-white text-zinc-900 hover:bg-zinc-50 hover:border-zinc-300 shadow-xs font-medium",
      ghost: "hover:bg-zinc-100 text-zinc-600 hover:text-zinc-950 font-medium",
      danger: "bg-red-50 text-red-600 border border-red-200 hover:bg-red-100 font-medium",
      subtle: "bg-zinc-50 text-zinc-700 border border-zinc-200 hover:bg-zinc-100 font-medium",
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
