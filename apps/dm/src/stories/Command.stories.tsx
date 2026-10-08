import type { Meta, StoryObj } from '@storybook/react-vite'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from '../components/ui/Command'
import { ThemeProvider } from '../contexts/ThemeContext'

function CommandDemo() {
  return (
    <ThemeProvider>
      <div style={{ background: 'var(--bg)', color: 'var(--ink)', minHeight: '100vh', padding: 24 }}>
        <Command style={{ maxWidth: 420 }} className="border border-border">
          <CommandInput placeholder="Buscar herramientas…" />
          <CommandList>
            <CommandEmpty>Sin resultados.</CommandEmpty>
            <CommandGroup heading="Mesa">
              <CommandItem>Tirar dados (D)</CommandItem>
              <CommandItem>Iniciativa</CommandItem>
              <CommandItem>Niebla</CommandItem>
            </CommandGroup>
            <CommandSeparator />
            <CommandGroup heading="Mundo">
              <CommandItem>Escenas</CommandItem>
              <CommandItem>Mapas</CommandItem>
              <CommandItem>PNJs</CommandItem>
            </CommandGroup>
          </CommandList>
        </Command>
      </div>
    </ThemeProvider>
  )
}

const meta = {
  title: 'Primitivas/Command',
  component: CommandDemo,
} satisfies Meta<typeof CommandDemo>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}