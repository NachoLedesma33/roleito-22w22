import type { Meta, StoryObj } from '@storybook/react-vite'
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from '../components/ui/Resizable'
import { ThemeProvider } from '../contexts/ThemeContext'

function ResizableDemo() {
  return (
    <ThemeProvider>
      <div style={{ background: 'var(--bg)', color: 'var(--ink)', height: '100vh', padding: 24 }}>
        <ResizablePanelGroup
          orientation="horizontal"
          style={{ height: 320, border: '1px solid var(--border)', borderRadius: 'var(--radius-md)' }}
        >
          <ResizablePanel defaultSize="30" minSize="15" style={{ padding: 16 }}>
            Riel de herramientas
          </ResizablePanel>
          <ResizableHandle withHandle />
          <ResizablePanel defaultSize="45" style={{ padding: 16 }}>
            Mesa (VTT)
          </ResizablePanel>
          <ResizableHandle withHandle />
          <ResizablePanel defaultSize="25" style={{ padding: 16 }}>
            Rail contextual
          </ResizablePanel>
        </ResizablePanelGroup>
      </div>
    </ThemeProvider>
  )
}

const meta = {
  title: 'Primitivas/Resizable',
  component: ResizableDemo,
} satisfies Meta<typeof ResizableDemo>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}