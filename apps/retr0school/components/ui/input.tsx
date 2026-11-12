import * as React from "react";
import { cn } from "@/lib/utils";

export const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>(function Input(
  { className, ...props },
  ref,
) {
  return (
    <input
      ref={ref}
      className={cn(
        "h-11 w-full rounded-md border border-line bg-elevated px-3 text-base text-ink placeholder:text-faint",
        className,
      )}
      {...props}
    />
  );
});
