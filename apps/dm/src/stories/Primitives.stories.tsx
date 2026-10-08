import type { Meta, StoryObj } from '@storybook/react-vite'
import { Badge } from '../components/ui/Badge'
import { Button } from '../components/ui/Button'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '../components/ui/Card'
import { StatBar } from '../components/ui/StatBar'
import { ThemeProvider } from '../contexts/ThemeContext'

function PrimitivesShowcase() {
  return (
    <div
      style={{
        background: 'var(--bg)',
        color: 'var(--ink)',
        minHeight: '100vh',
        padding: 24,
        display: 'grid',
        gap: 24,
      }}
    >
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
        <Button>Primario</Button>
        <Button variant="secondary">Secundario</Button>
        <Button variant="outline">Outline</Button>
        <Button variant="ghost">Ghost</Button>
        <Button variant="destructive">Destructivo</Button>
        <Button size="sm">Small</Button>
        <Button size="lg">Large</Button>
        <Button disabled>Deshabilitado</Button>
      </div>

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
        <Badge>Default</Badge>
        <Badge variant="secondary">Secondary</Badge>
        <Badge variant="outline">Outline</Badge>
        <Badge variant="hp">PV</Badge>
        <Badge variant="mp">PM</Badge>
        <Badge variant="canon">Canon</Badge>
      </div>

      <Card style={{ maxWidth: 420 }}>
        <CardHeader>
          <CardTitle>Ardan</CardTitle>
          <CardDescription>Guerrero de la Orden</CardDescription>
        </CardHeader>
        <CardContent style={{ display: 'grid', gap: 12 }}>
          <StatBar label="PV" value={18} max={24} tone="hp" />
          <StatBar label="PM" value={7} max={12} tone="mp" />
          <StatBar label="Defensa" value={15} max={20} tone="def" />
        </CardContent>
        <CardFooter style={{ gap: 8 }}>
          <Button size="sm">Usar</Button>
          <Button size="sm" variant="ghost">
            Editar
          </Button>
        </CardFooter>
      </Card>
    </div>
  )
}

const meta = {
  title: 'Primitivas/Base',
  component: PrimitivesShowcase,
  decorators: [
    (Story) => (
      <ThemeProvider>
        <Story />
      </ThemeProvider>
    ),
  ],
} satisfies Meta<typeof PrimitivesShowcase>

export default meta
type Story = StoryObj<typeof meta>

export const Base: Story = {}