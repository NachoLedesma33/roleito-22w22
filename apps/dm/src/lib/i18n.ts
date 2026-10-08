import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'

/**
 * i18n de Roleito. Preferencia de UI (no de campaña) persistida en localStorage.
 * Los nombres de campaña/personaje son datos y no se traducen.
 */
export type Language = 'es' | 'en'

export const LANGUAGES: ReadonlyArray<{ id: Language; label: string }> = [
  { id: 'es', label: 'Español' },
  { id: 'en', label: 'English' },
]

const resources = {
  es: {
    translation: {
      app: { name: 'Roleito', tagline: 'El mundo que tus sesiones recuerdan' },
      common: {
        loading: 'Cargando…',
        save: 'Guardar',
        cancel: 'Cancelar',
        continue: 'Continuar',
        open: 'Abrir',
        create: 'Crear',
        close: 'Cerrar',
        back: 'Volver',
      },
      landing: { cta: 'Comenzar', demo: 'Ver cómo funciona' },
      lobby: {
        title: 'Tu mesa',
        newCampaign: 'Nueva campaña',
        join: 'Unirse por código',
        import: 'Importar',
      },
      settings: {
        title: 'Ajustes',
        language: 'Idioma',
        theme: 'Tema',
        reducedMotion: 'Movimiento reducido',
        textSize: 'Tamaño de texto',
        contrast: 'Alto contraste',
        colorblind: 'Modo daltónico',
        volume: 'Volumen',
      },
    },
  },
  en: {
    translation: {
      app: { name: 'Roleito', tagline: 'The world your sessions remember' },
      common: {
        loading: 'Loading…',
        save: 'Save',
        cancel: 'Cancel',
        continue: 'Continue',
        open: 'Open',
        create: 'Create',
        close: 'Close',
        back: 'Back',
      },
      landing: { cta: 'Start', demo: 'See how it works' },
      lobby: {
        title: 'Your table',
        newCampaign: 'New campaign',
        join: 'Join by code',
        import: 'Import',
      },
      settings: {
        title: 'Settings',
        language: 'Language',
        theme: 'Theme',
        reducedMotion: 'Reduced motion',
        textSize: 'Text size',
        contrast: 'High contrast',
        colorblind: 'Colorblind mode',
        volume: 'Volume',
      },
    },
  },
} as const

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
  resources,
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