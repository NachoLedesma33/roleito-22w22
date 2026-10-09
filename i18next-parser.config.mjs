/**
 * i18next-parser — extrae claves de `t()`/`useTranslation()` del código y
 * mantiene sincronizados src/locales/{es,en}/translation.json.
 * Correr: `npm run i18n:extract`.
 *
 * Convención del repo: los textos nuevos se escriben con default en español —
 * t('ruta.clave', 'Texto en español') — el parser siembra ese valor en ambos
 * locales y después se traduce a mano el archivo `en`.
 */
export default {
  locales: ['es', 'en'],
  output: 'apps/dm/src/locales/$LOCALE/translation.json',
  input: ['apps/dm/src/**/*.{ts,tsx}', '!apps/dm/src/locales/**'],
  defaultNamespace: 'translation',
  namespaceSeparator: false,
  keySeparator: '.',
  createOldCatalogs: false,
  sort: true,
  lexers: {
    js: ['JsxLexer'],
    jsx: ['JsxLexer'],
    ts: ['JsxLexer'],
    tsx: ['JsxLexer'],
    default: ['JsxLexer'],
  },
  verbose: false,
}