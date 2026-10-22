// @vitest-environment jsdom
import { describe, expect, it, vi, afterEach, beforeEach } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import type { Campaign } from '@/lib/api'
import InviteMenu from './InviteMenu'

const ips = vi.fn()
const publicUrl = vi.fn()
vi.mock('@/lib/api', () => ({
  api: {
    network: { ips: () => ips(), publicUrl: () => publicUrl() },
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
  publicUrl.mockReset()
  publicUrl.mockResolvedValue({ public_url: null })
  // la URL recordada vive en localStorage: si no se limpia, un test
  // ensucia al siguiente.
  localStorage.clear()
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
  it('ofrece el link del tunel y los de la LAN, pero NO el de localhost', async () => {
    // localhost es la maquina de cada uno: no le sirve a nadie de la mesa, no
    // se muestra (si se comparte, el jugador cae en la landing del DM).
    ips.mockResolvedValue({ ips: ['192.168.1.6'] })
    abrir()

    await waitFor(() => expect(screen.getAllByTestId('invite-url').length).toBeGreaterThan(0))
    const urls = screen.getAllByTestId('invite-url').map((u) => u.textContent ?? '')
    expect(urls.some((u) => u.includes('192.168.1.6'))).toBe(true)
    expect(urls.some((u) => u.includes('/campaigns/join/CODE123'))).toBe(true)
    expect(urls.some((u) => u.includes('localhost'))).toBe(false)
  })

  it('copia el link y confirma que se copio', async () => {
    ips.mockResolvedValue({ ips: [] })
    abrir()

    await waitFor(() => expect(screen.getByTestId('invite-menu-content')).toBeTruthy())
    fireEvent.change(screen.getByLabelText('URL publica (si usas un tunel)'), {
      target: { value: 'https://mesa.trycloudflare.com' },
    })

    await waitFor(() => expect(screen.getAllByTestId('invite-url').length).toBeGreaterThan(0))
    const boton = screen.getAllByTestId('invite-url')[0]
    expect(boton.textContent).toContain('/campaigns/join/CODE123')

    fireEvent.click(boton)

    await waitFor(() => expect(boton.textContent).toContain('Copiado'))
    expect(writeText).toHaveBeenCalledWith(
      expect.stringContaining('/campaigns/join/CODE123'),
    )
  })

  it('el link fijo es el de la URL publica (no el de localhost) y confirma', async () => {
    ips.mockResolvedValue({ ips: [] })
    abrir(campPublico())

    await waitFor(() => expect(screen.getByTestId('invite-menu-content')).toBeTruthy())
    fireEvent.change(screen.getByLabelText('URL publica (si usas un tunel)'), {
      target: { value: 'https://mesa.trycloudflare.com' },
    })

    await waitFor(() => expect(screen.getByTestId('invite-fixed-link')).toBeTruthy())
    const boton = screen.getByTestId('invite-fixed-link')
    expect(boton.textContent).toContain('https://mesa.trycloudflare.com/join')
    expect(boton.textContent).not.toContain('Copiado')

    fireEvent.click(boton)

    await waitFor(() => expect(boton.textContent).toContain('Copiado'))
    expect(writeText).toHaveBeenCalledWith('https://mesa.trycloudflare.com/join')
  })

  it('con la URL publica en localhost, el link fijo no se muestra', async () => {
    // No le sirve a nadie de la mesa: no se ofrece.
    ips.mockResolvedValue({ ips: [] })
    abrir(campPublico())

    await waitFor(() => expect(screen.getByTestId('invite-menu-content')).toBeTruthy())
    expect(screen.queryByTestId('invite-fixed-link')).toBeNull()
  })

  it('el boton de la URL publica copia el LINK DE LA PARTIDA, no la URL pelada', async () => {
    // La URL pelada (https://<tunel>) abre la LANDING (que es del DM): si se
    // comparte eso, el jugador no llega al POV. Lo que se comparte es el link
    // con el codigo.
    ips.mockResolvedValue({ ips: [] })
    abrir()

    await waitFor(() => expect(screen.getByTestId('invite-menu-content')).toBeTruthy())
    const boton = screen.getByTestId('invite-copy-public-url')

    fireEvent.change(screen.getByLabelText('URL publica (si usas un tunel)'), {
      target: { value: 'https://mesa.trycloudflare.com' },
    })

    await waitFor(() => expect(boton.hasAttribute('disabled')).toBe(false))
    fireEvent.click(boton)

    await waitFor(() =>
      expect(writeText).toHaveBeenCalledWith(
        'https://mesa.trycloudflare.com/campaigns/join/CODE123',
      ),
    )
  })

  it('cada link de la mesa tiene su boton de copiar', async () => {
    // El link de la LAN tambien: cada URL que se puede compartir, con su
    // boton (y con confirmacion al copiar).
    ips.mockResolvedValue({ ips: ['192.168.1.6'] })
    abrir()

    await waitFor(() => expect(screen.getByTestId('invite-menu-content')).toBeTruthy())
    fireEvent.change(screen.getByLabelText('URL publica (si usas un tunel)'), {
      target: { value: 'https://mesa.trycloudflare.com' },
    })

    await waitFor(() => expect(screen.getAllByTestId('invite-url').length).toBeGreaterThan(1))
    const links = screen.getAllByTestId('invite-url')
    for (const link of links) {
      expect(link.querySelector('[data-testid="invite-copy-icon"]')).toBeTruthy()
    }

    // Y el de la LAN copia SU url (con el codigo, no la pelada).
    const lan = links.find((l) => l.textContent?.includes('192.168.1.6'))
    expect(lan).toBeTruthy()
    fireEvent.click(lan!)
    await waitFor(() =>
      expect(writeText).toHaveBeenCalledWith(
        expect.stringContaining('192.168.1.6'),
      ),
    )
    expect(writeText).toHaveBeenCalledWith(expect.stringContaining('/campaigns/join/CODE123'))
  })

  it('si el portapapeles falla, lo avisa y no deja el check del link anterior', async () => {
    ips.mockResolvedValue({ ips: ['192.168.1.6'] })
    abrir()

    await waitFor(() => expect(screen.getByTestId('invite-menu-content')).toBeTruthy())
    fireEvent.change(screen.getByLabelText('URL publica (si usas un tunel)'), {
      target: { value: 'https://mesa.trycloudflare.com' },
    })

    await waitFor(() => expect(screen.getAllByTestId('invite-url').length).toBeGreaterThan(1))
    const links = screen.getAllByTestId('invite-url')

    // Copia el primero bien: queda el check en el.
    fireEvent.click(links[0])
    await waitFor(() => expect(links[0].textContent).toContain('Copiado'))

    // El segundo falla: NO puede quedar el check del primero (pareceria que
    // se copio ese).
    writeText.mockRejectedValueOnce(new Error('bloqueado'))
    fireEvent.click(links[1])

    await waitFor(() => expect(screen.getByTestId('invite-copy-error')).toBeTruthy())
    expect(links[0].textContent).not.toContain('Copiado')
    expect(links[1].textContent).not.toContain('Copiado')
  })

  it('la URL publica arranca con el origen de la app (hay algo que copiar)', async () => {
    // Si el DM esta jugando por el tunel, el origen ES la URL que llega a
    // los jugadores: con el campo vacio el menu ofrecia el link de localhost
    // (inutil para la mesa) y el boton de copiar no tenia nada que copiar.
    ips.mockResolvedValue({ ips: [] })
    abrir()

    await waitFor(() => expect(screen.getByTestId('invite-menu-content')).toBeTruthy())
    const campo = screen.getByLabelText('URL publica (si usas un tunel)')
    expect((campo as HTMLInputElement).value).toBe(window.location.origin)

    const boton = screen.getByTestId('invite-copy-public-url')
    expect(boton.hasAttribute('disabled')).toBe(false)

    fireEvent.click(boton)
    await waitFor(() => expect(writeText).toHaveBeenCalled())
    // Copia el link de la partida (con el codigo), no la URL pelada.
    expect(writeText).toHaveBeenCalledWith(
      expect.stringContaining('/campaigns/join/CODE123'),
    )
  })

  it('si el DM juega en local, ofrece la URL del tunel que tiene abierta', async () => {
    // El DM juega en localhost: localhost no le sirve a nadie de la mesa.
    // El backend sabe que URL publica tiene el tunel (el script del tunel la
    // deja en data/tunnel_url.txt) -> el menu la ofrece sola.
    ips.mockResolvedValue({ ips: [] })
    publicUrl.mockResolvedValue({ public_url: 'https://mesa.trycloudflare.com' })
    abrir()

    await waitFor(() => expect(screen.getByTestId('invite-menu-content')).toBeTruthy())
    // (sin jest-dom: el valor se lee del input)
    await waitFor(() =>
      expect(
        (screen.getByLabelText('URL publica (si usas un tunel)') as HTMLInputElement)
          .value,
      ).toBe('https://mesa.trycloudflare.com'),
    )

    // Y el link que ofrece es el del tunel con el codigo ✓.
    const enlace = screen.getByTestId('invite-url')
    expect(enlace.textContent).toContain(
      'https://mesa.trycloudflare.com/campaigns/join/CODE123',
    )
  })

  it('avisa cuando el tunel es efimero (la URL cambia cada partida)', async () => {
    ips.mockResolvedValue({ ips: [] })
    abrir()

    await waitFor(() => expect(screen.getByTestId('invite-menu-content')).toBeTruthy())
    // El origen del test es localhost: no es efimero.
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
