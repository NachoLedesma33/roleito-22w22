import type { Meta, StoryObj } from '@storybook/react-vite'
import { useState } from 'react'
import { Button } from '../components/ui/Button'
import { Island, type IslandItem } from '../components/ui/Island'
import { ThemeProvider } from '../contexts/ThemeContext'

const ITEMS: ReadonlyArray<IslandItem> = [
  { id: 'dice', label: 'Dados', hint: 'Tirar' },
  { id: 'initiative', label: 'Iniciativa', hint: 'Orden de turno' },
  { id: 'fog', label: 'Niebla', hint: 'Vision' },
  { id: 'light', label: 'Luz', hint: 'Iluminacion' },
  { id: 'notes', label: 'Notas', hint: 'Cuaderno' },
  { id: 'tokens', label: 'Tokes', hint: 'Fichas' },
  { id: 'weather', label: 'Clima', hint: 'Atmosfera' },
  { id: 'npcs', label: 'PNJs', hint: 'Reparto' },
]

function IslandDemo() {
  const [open, setOpen] = useState(true)
  const [chosen, setChosen] = useState<string | null>(null)
  return (
    <div style={{ background: 'var(--bg)', color: 'var(--ink)', minHeight: '100vh', padding: 24 }}>
      <Button onClick={() => setOpen(true)}>Abrir isla</Button>
      {chosen ? <p style={{ marginTop: 16 }}>Elegido: {chosen}</p> : null}
      <Island
        open={open}
        title="Mesa"
        items={ITEMS}
        onClose={() => setOpen(false)}
        onSelect={(id) => {
          setChosen(id)
          setOpen(false)
        }}
      />
    </div>
  )
}

const meta = {
  title: 'Primitivas/Island',
  component: IslandDemo,
  decorators: [
    (Story) => (
      <ThemeProvider>
        <Story />
      </ThemeProvider>
    ),
  ],
} satisfies Meta<typeof IslandDemo>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}