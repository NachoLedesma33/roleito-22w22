import { cn } from '@/lib/utils'

const TONES = {
  hp: 'bg-hp',
  mp: 'bg-mp',
  def: 'bg-def',
  success: 'bg-success',
  warning: 'bg-warning',
} as const

export type StatBarTone = keyof typeof TONES

export interface StatBarProps {
  label: string
  value: number
  max: number
  tone?: StatBarTone
  showNumbers?: boolean
  className?: string
}

export function StatBar({ label, value, max, tone = 'hp', showNumbers = true, className }: StatBarProps) {
  const safeMax = max > 0 ? max : 1
  const pct = Math.max(0, Math.min(100, (value / safeMax) * 100))
  return (
    <div className={cn('flex flex-col gap-1', className)}>
      <div className="flex items-center justify-between text-xs text-ink-muted">
        <span>{label}</span>
        {showNumbers ? (
          <span>
            {value} / {max}
          </span>
        ) : null}
      </div>
      <div
        role="progressbar"
        aria-label={label}
        aria-valuenow={value}
        aria-valuemin={0}
        aria-valuemax={max}
        className="h-2 w-full overflow-hidden rounded-full bg-surface-2"
      >
        <div
          className={cn('h-full rounded-full transition-[width] duration-base ease-standard', TONES[tone])}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  )
}