import { GripVertical } from 'lucide-react'
import type { ComponentProps } from 'react'
import * as ResizablePrimitive from 'react-resizable-panels'
import { cn } from '@/lib/utils'

export const ResizablePanelGroup = ({ className, ...props }: ComponentProps<typeof ResizablePrimitive.Group>) => (
  <ResizablePrimitive.Group className={cn('h-full w-full', className)} {...props} />
)

export const ResizablePanel = ResizablePrimitive.Panel

export function ResizableHandle({
  withHandle,
  className,
  ...props
}: ComponentProps<typeof ResizablePrimitive.Separator> & { withHandle?: boolean }) {
  return (
    <ResizablePrimitive.Separator
      className={cn('relative flex items-center justify-center bg-border focus-visible:outline-none', className)}
      {...props}
    >
      {withHandle ? (
        <div className="z-10 flex h-4 w-3 items-center justify-center rounded-sm border border-border bg-surface">
          <GripVertical className="h-2.5 w-2.5 text-ink-muted" />
        </div>
      ) : null}
    </ResizablePrimitive.Separator>
  )
}