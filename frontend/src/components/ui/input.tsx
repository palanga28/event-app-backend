import * as React from "react"

import { cn } from "@/lib/utils"

const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          "glass-input flex h-10 w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-base text-white placeholder:text-white/40 backdrop-blur-sm shadow-sm transition-all duration-200 file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-white focus-visible:border-purple-500/50 focus-visible:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-500/30 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
          className
        )}
        ref={ref}
        {...props}
      />
    )
  }
)
Input.displayName = "Input"

export { Input }
