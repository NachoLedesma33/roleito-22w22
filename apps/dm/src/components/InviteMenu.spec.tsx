// @vitest-environment jsdom
import { describe, expect, it, vi, afterEach } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import type { Campaign } from '@/lib/api'
import InviteMenu from './InviteMenu'

const ips = vi.fn()
vi.mock('@/lib/api', () => ({
  api: {
    network: { ips: () => ips() },
    campaigns: { generateInviteCode: vi.fn() },
  },
}))

vi.mock('@/lib/i18n', () => ({
  default: { t: (_key: string, fallback?: string) => fallback ?? _key },
}))

afterEach(cleanup)

function camp(): Campaign {
  return { id: 'camp-1', name: 'Camp', invite_code: 'CODE123' } as unknown as Campaign
}

function abrir() {
  render(<InviteMenu campaign={camp()} onCampaignChange={vi.fn()} />)
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
