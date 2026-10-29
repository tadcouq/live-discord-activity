import { cva, type VariantProps } from "class-variance-authority";
import { forwardRef } from "preact/compat";
import { JSX } from "preact";
import { cn } from "../lib/utils.ts";

export const buttonVariants = cva("inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2 cursor-pointer font-medium transition-colors duration-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-400 disabled:cursor-not-allowed motion-reduce:transition-none", {
 variants: {
  variant: {
   primary: "border border-blue-400/60 bg-blue-500 text-white shadow-sm shadow-blue-950/40 hover:border-blue-300 hover:bg-blue-600 disabled:border-neutral-700 disabled:bg-neutral-800 disabled:text-neutral-500 disabled:shadow-none",
   secondary: "border border-neutral-600 bg-neutral-800 text-neutral-100 hover:border-neutral-500 hover:bg-neutral-700 disabled:border-neutral-800 disabled:bg-neutral-900 disabled:text-neutral-500",
  },
  defaultVariants: {
   variant: "primary",
  },
 },
});

interface ButtonProps extends JSX.HTMLAttributes<HTMLButtonElement> {
 variant?: VariantProps<typeof buttonVariants>["variant"];
 disabled?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(({ variant, className, children, ...props }, ref) => {
 return (
  <button ref={ref} {...props} className={cn(buttonVariants({ variant }), className)}>
   {children}
  </button>
 );
});
