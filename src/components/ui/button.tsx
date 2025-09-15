import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/clientUtils"

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-1 whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-primary/90",
        destructive:
          "bg-destructive text-destructive-foreground hover:bg-destructive/90",
        outline:
          "border border-input bg-background hover:bg-accent hover:text-accent-foreground",
        secondary:
          "bg-secondary text-secondary-foreground hover:bg-secondary/80",
        ghost: "hover:bg-[hsl(var(--overlay))] hover:text-accent-foreground",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "h-10 px-3 py-2 [&>svg]:w-4 [&>svg]:h-4",
        sm: "h-9 px-1.5 py-1.5 [&>svg]:w-3 [&>svg]:h-3",
        lg: "h-11 px-3 py-3 text-base [&>svg]:w-5 [&>svg]:h-5",
        icon: "h-9 w-9 [&>svg]:w-4 [&>svg]:h-4",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, children, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"

    // Helper to wrap string/number children in a span with padding based on size
    const wrapLabel = (child: React.ReactNode, key?: React.Key) => {
      if (typeof child !== "string" && typeof child !== "number") return child;
      
      const paddingClass = size === "sm" ? "px-1" : "px-2";
      return <span key={key} className={paddingClass}>{child}</span>;
    };

    let content;
    if (Array.isArray(children)) {
      content = children.map((child, i) => wrapLabel(child, i));
    } else {
      content = wrapLabel(children);
    }

    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      >
        {content}
      </Comp>
    )
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }
