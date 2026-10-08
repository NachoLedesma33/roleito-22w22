import type { Meta, StoryObj } from '@storybook/react-vite'
import { toast } from 'sonner'
import { Button } from '../components/ui/Button'
import { Toaster } from '../components/ui/Toaster'
import { ThemeProvider } from '../contexts/ThemeContext'

function ToastsDemo() {
  return (
    <ThemeProvider>
      <div
        style={{
          background: 'var(--bg)',
          color: 'var(--ink)',
          minHeight: '100vh',
          padding: 24,
          display: 'flex',
          gap: 12,
          flexWrap: 'wrap',
          alignContent: 'start',
        }}
      >
        <Button onClick={() => toast('Tirada registrada')}>Info</Button>
        <Button variant="secondary" onClick={() => toast.success('Guardado')}>
          Exito
        </Button>
        <Button variant="outline" onClick={() => toast.warning('Falta PM')}>
          Aviso
        </Button>
        <Button variant="destructive" onClick={() => toast.error('Error de red')}>
          Error
        </Button>
        <Toaster />
      </div>
    </ThemeProvider>
  )
}

const meta = {
  title: 'Primitivas/Toasts',
  component: ToastsDemo,
} satisfies Meta<typeof ToastsDemo>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}