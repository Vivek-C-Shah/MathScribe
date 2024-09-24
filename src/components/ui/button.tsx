// src/components/ui/button.tsx

import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

/**
 * Define the button variants using `class-variance-authority`.
 * Added a new `color` variant to handle dynamic colors for the 'filled' variant.
 */
const buttonVariants = cva(
  "inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
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
        ghost: "hover:bg-accent hover:text-accent-foreground",
        link: "text-primary underline-offset-4 hover:underline",
        filled: "", // 'filled' variant will utilize 'color' variant through compoundVariants
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-9 rounded-md px-3",
        lg: "h-11 rounded-md px-8",
        icon: "h-10 w-10",
      },
      color: {
        red: "bg-red-600 text-white hover:bg-red-700",
        blue: "bg-blue-600 text-white hover:bg-blue-700",
        green: "bg-green-600 text-white hover:bg-green-700",
        gray: "bg-gray-600 text-white hover:bg-gray-700",
        // Add more colors as needed
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
      color: "gray",
    },
    compoundVariants: [
      // Apply color-specific styles when variant is 'filled'
      {
        variant: "filled",
        color: "red",
        className: "bg-red-600 text-white hover:bg-red-700",
      },
      {
        variant: "filled",
        color: "blue",
        className: "bg-blue-600 text-white hover:bg-blue-700",
      },
      {
        variant: "filled",
        color: "green",
        className: "bg-green-600 text-white hover:bg-green-700",
      },
      {
        variant: "filled",
        color: "gray",
        className: "bg-gray-600 text-white hover:bg-gray-700",
      },
      // Add more compound variants for additional colors
    ],
  }
)

/**
 * Interface for ButtonProps
 *
 * - Extends all standard button attributes except 'color'.
 * - Includes variant and size props defined by `buttonVariants`.
 * - Adds an optional `asChild` prop for rendering as a different component.
 */
export interface ButtonProps
  extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'color'>,
  VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

/**
 * Button Component
 *
 * Renders a button with variant, size, and color styles.
 * Can render as a different component if `asChild` is true.
 */
const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, color, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, color, className }))}
        ref={ref}
        {...props}
      />
    )
  }
)

Button.displayName = "Button"

export { Button, buttonVariants }
