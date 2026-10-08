import { cva, type VariantProps } from 'class-variance-authority'
import type { HTMLAttributes } from 'react'
import { cn } from '@/lib/utils'

const badgeVariants = cva(
  'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors',
  {
    variants: {
      variant: {
        default: 'border-transparent bg-brand text-on-brand',
        secondary: 'border-transparent bg-surface-2 text-ink-muted',
        outline: 'border-border text-ink',
        hp: 'border-transparent bg-hp text-on-danger',
        mp: 'border-transparent bg-mp text-on-brand',
        def: 'border-transparent bg-def text-on-brand',
        success: 'border-transparent bg-success text-on-brand',
        warning: 'border-transparent bg-warning text-on-brand',
        danger: 'border-transparent bg-danger text-on-danger',
        canon: 'border-transparent bg-canon text-on-brand',
        proposed: 'border-transparent bg-proposed text-on-brand',
      },
    },
    defaultVariants: { variant: 'default' },
  },
)

export interface BadgeProps
  extends HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

export function Badge({ className, variant, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />
}

export { badgeVariants }