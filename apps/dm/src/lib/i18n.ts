import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import es from '../locales/es/translation.json'
import en from '../locales/en/translation.json'

/**
 * i18n de Roleito. Preferencia de UI (no de campaña) persistida en localStorage.
 * Los nombres de campaña/personaje son datos y no se traducen.
 * Los archivos de idioma (src/locales/{es,en}/translation.json) son generados
 * y mantenidos con `i18next-parser` (`npm run i18n:extract`).
 */
export type Language = 'es' | 'en'

export const LANGUAGES: ReadonlyArray<{ id: Language; label: string }> = [
  { id: 'es', label: 'Español' },
  { id: 'en', label: 'English' },
]

const STORAGE_KEY = 'roleito:lang'

function initialLanguage(): Language {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw === 'es' || raw === 'en') return raw
  } catch {
    /* localStorage no disponible */
  }
  const nav = typeof navigator !== 'undefined' ? navigator.language.slice(0, 2) : 'es'
  return nav === 'en' ? 'en' : 'es'
}

void i18n.use(initReactI18next).init({
  resources: {
    es: { translation: es },
    en: { translation: en },
  },
  lng: initialLanguage(),
  fallbackLng: 'es',
  interpolation: { escapeValue: false },
})

i18n.on('languageChanged', (lng) => {
  try {
    localStorage.setItem(STORAGE_KEY, lng)
  } catch {
    /* localStorage no disponible */
  }
})

export default i18n