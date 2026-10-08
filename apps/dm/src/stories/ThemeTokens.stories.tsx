import type { Meta, StoryObj } from '@storybook/react-vite'
import { THEMES, ThemeProvider, useTheme } from '../contexts/ThemeContext'

const GROUPS: ReadonlyArray<{ title: string; tokens: string[] }> = [
  { title: 'Superficie', tokens: ['--bg', '--surface', '--surface-2', '--border'] },
  { title: 'Texto', tokens: ['--ink', '--ink-muted', '--ink-faint'] },
  {
    title: 'Marca y estados',
    tokens: [
      '--brand',
      '--hp',
      '--mp',
      '--def',
      '--success',
      '--warning',
      '--danger',
      '--info',
      '--canon',
      '--proposed',
      '--rejected',
      '--dm-only',
    ],
  },
]

function TokenSwatches() {
  const { theme, setTheme } = useTheme()
  return (
    <div style={{ background: 'var(--bg)', color: 'var(--ink)', minHeight: '100vh', padding: 24 }}>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 24 }}>
        {THEMES.map((t) => (
          <button
            key={t.id}
            type="button"
            aria-pressed={theme === t.id}
            onClick={() => setTheme(t.id)}
            style={{
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius-sm)',
              background: theme === t.id ? 'var(--brand)' : 'var(--surface)',
              color: 'var(--ink)',
              padding: '6px 12px',
              cursor: 'pointer',
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {GROUPS.map((group) => (
        <section key={group.title} style={{ marginBottom: 24 }}>
          <h3 style={{ margin: '0 0 8px', fontSize: 14, color: 'var(--ink-muted)' }}>{group.title}</h3>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            {group.tokens.map((token) => (
              <div key={token} style={{ width: 96 }}>
                <div
                  style={{
                    background: `var(${token})`,
                    border: '1px solid var(--border)',
                    borderRadius: 'var(--radius-sm)',
                    height: 56,
                  }}
                />
                <code style={{ fontSize: 11, color: 'var(--ink-muted)' }}>{token}</code>
              </div>
            ))}
          </div>
        </section>
      ))}
    </div>
  )
}

const meta = {
  title: 'Fundaciones/Tokens y temas',
  component: TokenSwatches,
  decorators: [
    (Story) => (
      <ThemeProvider>
        <Story />
      </ThemeProvider>
    ),
  ],
} satisfies Meta<typeof TokenSwatches>

export default meta
type Story = StoryObj<typeof meta>

export const Temas: Story = {}