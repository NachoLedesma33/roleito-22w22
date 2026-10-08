import type { Meta, StoryObj } from '@storybook/react-vite'
import { Button } from '../components/ui/Button'
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '../components/ui/Dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/Tabs'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '../components/ui/Tooltip'
import { ThemeProvider } from '../contexts/ThemeContext'

function OverlaysShowcase() {
  return (
    <div
      style={{
        background: 'var(--bg)',
        color: 'var(--ink)',
        minHeight: '100vh',
        padding: 24,
        display: 'grid',
        gap: 24,
        alignContent: 'start',
      }}
    >
      <div style={{ display: 'flex', gap: 12 }}>
        <Dialog>
          <DialogTrigger asChild>
            <Button>Abrir dialogo</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Confirmar tirada</DialogTitle>
              <DialogDescription>Tirar 1d20 + 5 para Ardan?</DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <DialogClose asChild>
                <Button variant="ghost">Cancelar</Button>
              </DialogClose>
              <DialogClose asChild>
                <Button>Tirar</Button>
              </DialogClose>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="outline">Hover</Button>
          </TooltipTrigger>
          <TooltipContent>Tirar dados (D)</TooltipContent>
        </Tooltip>
      </div>

      <Tabs defaultValue="stats">
        <TabsList>
          <TabsTrigger value="stats">Stats</TabsTrigger>
          <TabsTrigger value="spells">Hechizos</TabsTrigger>
          <TabsTrigger value="notes">Notas</TabsTrigger>
        </TabsList>
        <TabsContent value="stats">PV, PM, Defensa</TabsContent>
        <TabsContent value="spells">Catalogo de habilidades</TabsContent>
        <TabsContent value="notes">Cuaderno del DM</TabsContent>
      </Tabs>
    </div>
  )
}

const meta = {
  title: 'Primitivas/Overlays',
  component: OverlaysShowcase,
  decorators: [
    (Story) => (
      <ThemeProvider>
        <TooltipProvider>
          <Story />
        </TooltipProvider>
      </ThemeProvider>
    ),
  ],
} satisfies Meta<typeof OverlaysShowcase>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}