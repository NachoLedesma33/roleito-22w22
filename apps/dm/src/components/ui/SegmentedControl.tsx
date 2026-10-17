import { cn } from '@/lib/utils'

export interface SegmentedOption<T extends string> {
  value: T
  label: string
  /** Texto del `title`: el tooltip es donde va el matiz de la opción. */
  title?: string
  /** Clase del botón activo. Por defecto verde, como el "Revelar" de siempre. */
  activeClassName?: string
  testId?: string
}

interface SegmentedControlProps<T extends string> {
  value: T
  options: SegmentedOption<T>[]
  onChange: (value: T) => void
  label?: string
  className?: string
  buttonClassName?: string
  testId?: string
}

/**
 * Grupo de opciones excluyentes en una fila (tipo segmentado).
 *
 * Existe porque el selector de modo de la niebla y el de tipo de visión son el
 * mismo control con distinto contenido: no vale la pena dos implementaciones
 * distintas, y menos dos juegos de botones pegados con `onClick` a mano.
 */
export default function SegmentedControl<T extends string>({
  value,
  options,
  onChange,
  label,
  className,
  buttonClassName,
  testId,
}: SegmentedControlProps<T>) {
  return (
    <div
      role="radiogroup"
      aria-label={label}
      className={cn('flex items-center gap-1', className)}
      data-testid={testId}
    >
      {options.map((opt) => (
        <button
          key={opt.value}
          type="button"
          role="radio"
          aria-checked={value === opt.value}
          title={opt.title}
          data-testid={opt.testId ?? `segmented-${opt.value}`}
          onClick={() => onChange(opt.value)}
          className={cn(
            'text-[10px] px-2 py-0.5 rounded transition-colors',
            value === opt.value
              ? (opt.activeClassName ?? 'bg-green-600 text-white')
              : 'text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)]',
            buttonClassName,
          )}
        >
          {opt.label}
        </button>
      ))}
    </div>
  )
}