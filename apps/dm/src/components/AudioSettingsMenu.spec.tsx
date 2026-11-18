// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import AudioSettingsMenu from './AudioSettingsMenu'

afterEach(cleanup)
beforeEach(() => localStorage.clear())

function openMenu() {
  fireEvent.click(screen.getByTestId('audio-volume'))
}

describe('AudioSettingsMenu', () => {
  it('muestra el control de ambiente con su valor por defecto', () => {
    render(<AudioSettingsMenu />)
    openMenu()
    const slider = screen.getByTestId('audio-volume-ambience') as HTMLInputElement
    expect(slider).toBeTruthy()
    expect(slider.value).toBe('0.6')
    expect(screen.getByTestId('audio-volume-ambience-value').textContent).toBe('60%')
  })

  it('persiste el volumen de ambiente al mover el slider', () => {
    render(<AudioSettingsMenu />)
    openMenu()
    fireEvent.change(screen.getByTestId('audio-volume-ambience'), { target: { value: '0.3' } })
    expect(localStorage.getItem('roleito:audio:ambience')).toBe('0.3')
  })
})
