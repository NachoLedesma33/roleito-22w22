// @vitest-environment jsdom
import { describe, expect, it, vi, afterEach, beforeEach } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import type { Campaign } from '@/lib/api'
import InviteMenu from './InviteMenu'

const ips = vi.fn()
vi.mock('@/lib/api', () => ({
  api: {
    network: { ips: () => ips() },
    campaigns: { generateInviteCode: vi.fn(), setPublicJoin: vi.fn() },
  },
}))

vi.mock('@/lib/i18n', () => ({
  default: { t: (_key: string, fallback?: string) => fallback ?? _key },
}))

afterEach(cleanup)

// jsdom no tiene portapapeles: el menu avisa "Copiado" solo si la escritura
// funciono, asi que hay que falsearlo para probar la confirmacion.
const writeText = vi.fn().mockResolvedValue(undefined)
beforeEach(() => {
  writeText.mockClear()
  Object.defineProperty(navigator, 'clipboard', {
    value: { writeText },
    configurable: true,
  })
})

function camp(): Campaign {
  return { id: 'camp-1', name: 'Camp', invite_code: 'CODE123' } as unknown as Campaign
}

function campPublico(): Campaign {
  const c = { ...camp() } as unknown as Record<string, unknown>
  c.settings_json = { public_join: true }
  return c as unknown as Campaign
}

function abrir(c: Campaign = camp()) {
  render(<InviteMenu campaign={c} onCampaignChange={vi.fn()} />)
  fireEvent.click(screen.getByTestId('invite-button'))
}

describe('InviteMenu', () => {
  it('lista el link de esta maquina y los de la red local', async () => {
    ips.mockResolvedValue({ ips: ['192.168.1.6'] })
    abrir()

    await waitFor(() => expect(screen.getAllByTestId('invite-url').length).toBeGreaterThan(0))
    const urls = screen.getAllByTestId('invite-url').map((u) => u.textContent ?? '')
    expect(urls.some((u) => u.includes('/campaigns/join/CODE123'))).toBe(true)
    expect(urls.some((u) => u.includes('192.168.1.6'))).toBe(true)
  })

  it('copia el link y confirma que se copio', async () => {
    ips.mockResolvedValue({ ips: [] })
    abrir()

    await waitFor(() => expect(screen.getAllByTestId('invite-url').length).toBeGreaterThan(0))
    const boton = screen.getAllByTestId('invite-url')[0]
    expect(boton.textContent).toContain('/campaigns/join/CODE123')

    fireEvent.click(boton)

    await waitFor(() => expect(boton.textContent).toContain('Copiado'))
    expect(writeText).toHaveBeenCalledWith(
      expect.stringContaining('/campaigns/join/CODE123'),
    )
  })

  it('el link fijo tambien confirma que se copio', async () => {
    ips.mockResolvedValue({ ips: [] })
    abrir(campPublico())

    await waitFor(() => expect(screen.getByTestId('invite-fixed-link')).toBeTruthy())
    const boton = screen.getByTestId('invite-fixed-link')
    expect(boton.textContent).toContain('/join')
    expect(boton.textContent).not.toContain('Copiado')

    fireEvent.click(boton)

    await waitFor(() => expect(boton.textContent).toContain('Copiado'))
    expect(writeText).toHaveBeenCalledWith(expect.stringContaining('/join'))
  })

  it('la URL publica tiene boton de copiar', async () => {
    ips.mockResolvedValue({ ips: [] })
    abrir()

    await waitFor(() => expect(screen.getByTestId('invite-menu-content')).toBeTruthy())
    const boton = screen.getByTestId('invite-copy-public-url')
    // Sin URL pegada, el boton no hace nada.
    expect(boton.hasAttribute('disabled')).toBe(true)

    fireEvent.change(screen.getByLabelText('URL publica (si usas un tunel)'), {
      target: { value: 'https://mesa.trycloudflare.com' },
    })

    await waitFor(() => expect(boton.hasAttribute('disabled')).toBe(false))
    fireEvent.click(boton)

    await waitFor(() =>
      expect(writeText).toHaveBeenCalledWith('https://mesa.trycloudflare.com'),
    )
  })

  it('avisa cuando el tunel es efimero (la URL cambia cada partida)', async () => {
    ips.mockResolvedValue({ ips: [] })
    abrir()

    await waitFor(() => expect(screen.getByTestId('invite-menu-content')).toBeTruthy())
    expect(screen.queryByTestId('invite-ephemeral-hint')).toBeNull()

    fireEvent.change(screen.getByLabelText('URL publica (si usas un tunel)'), {
      target: { value: 'https://mesa-abc.trycloudflare.com' },
    })

    await waitFor(() => expect(screen.getByTestId('invite-ephemeral-hint')).toBeTruthy())
  })

  it('con una URL fija no avisa de nada', async () => {
    ips.mockResolvedValue({ ips: [] })
    abrir()

    await waitFor(() => expect(screen.getByTestId('invite-menu-content')).toBeTruthy())
    fireEvent.change(screen.getByLabelText('URL publica (si usas un tunel)'), {
      target: { value: 'https://mesa.midominio.com' },
    })

    await waitFor(() => {
      expect(screen.getByTestId('invite-url').textContent).toContain('mesa.midominio.com')
    })
    expect(screen.queryByTestId('invite-ephemeral-hint')).toBeNull()
  })

  it('con URL publica pegada, ese es el link que se ofrece', async () => {
    // El caso del playtest remoto: el DM expone la app por un tunel y
    // comparte ese link, no el de localhost.
    ips.mockResolvedValue({ ips: [] })
    abrir()

    fireEvent.change(screen.getByLabelText('URL publica (si usas un tunel)'), {
      target: { value: 'https://mesa.trycloudflare.com/' },
    })

    await waitFor(() => {
      const urls = screen.getAllByTestId('invite-url').map((u) => u.textContent ?? '')
      expect(urls[0]).toContain('https://mesa.trycloudflare.com/campaigns/join/CODE123')
    })
  })
})
