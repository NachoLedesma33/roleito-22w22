// @vitest-environment jsdom
import { describe, expect, it, vi, afterEach } from 'vitest'
import { cleanup, render, screen, waitFor } from '@testing-library/react'
import JoinRedirect from './JoinRedirect'

const activeInvite = vi.fn()
vi.mock('@/lib/api', () => ({
  api: { campaigns: { activeInvite: () => activeInvite() } },
}))

vi.mock('@/lib/i18n', () => ({
  default: { t: (_key: string, fallback?: string) => fallback ?? _key },
}))

afterEach(cleanup)

describe('JoinRedirect', () => {
  it('lleva al jugador a la partida abierta', async () => {
    activeInvite.mockResolvedValue({ invite_code: 'CODE123', campaign_id: 'c1', campaign_name: 'Mesa' })
    const replace = vi.fn()
    vi.spyOn(window, 'location', 'get').mockReturnValue({ replace } as unknown as Location)

    render(<JoinRedirect />)

    await waitFor(() => expect(replace).toHaveBeenCalledWith('/campaigns/join/CODE123'))
  })

  it('avisa cuando no hay ninguna partida abierta', async () => {
    activeInvite.mockRejectedValue(new Error('404'))

    render(<JoinRedirect />)

    await waitFor(() =>
      expect(screen.getByText('No hay ninguna partida abierta. Preguntale al DM.')).toBeTruthy(),
    )
  })
})
