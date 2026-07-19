import { cva, type VariantProps } from "class-variance-authority";
import * as React from "react";
import { cn } from "../../lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold transition-colors",
  {
    variants: {
      variant: {
        default: "bg-teal/10 text-teal border border-teal/20",
        secondary: "bg-muted text-muted-foreground",
        outline: "border border-border text-foreground",
        local: "bg-emerald-50 text-emerald-700 border border-emerald-200",
        state: "bg-blue-50 text-blue-700 border border-blue-200",
        national: "bg-amber-50 text-amber-700 border border-amber-200",
        international: "bg-purple-50 text-purple-700 border border-purple-200",
        score: "bg-teal/10 text-teal border border-teal/20 font-bold",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
