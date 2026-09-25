import React from "react";
import clsx from "clsx";
import { twMerge } from "tailwind-merge";

export interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  className?: string;
  as?: React.ElementType;
}

export function Skeleton({
  className,
  as: Component = "div",
  ...props
}: SkeletonProps) {
  return (
    <Component
      aria-hidden="true"
      className={twMerge(
        clsx(
          "bg-zinc-800/50 dark:bg-zinc-800/50 rounded-lg animate-shimmer relative overflow-hidden",
          className
        )
      )}
      {...props}
    />
  );
}

export default Skeleton;
