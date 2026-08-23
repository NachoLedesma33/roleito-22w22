# Test Assets — créditos y regeneración

Los binarios de este directorio NO se versionan (`.gitignore`). Descargar una vez
para que los tests `@showcase` y la campaña demo funcionen.

## Contenido esperado

```text
maps/
  tavern-1536.jpg              ← Taberna del Grifo Helado (1536x1024)
  forest-wilderness-1024.jpg   ← Bosque Salvaje (1024x1536)
  dungeon-crypt-1024.jpg       ← Cripta Antigua (1024x1536)
portraits/velazquez_portraits/
  female_01.png ... male_17.png  ← 30 retratos, pinturas de Velázquez
```

## Fuentes y licencias

| Fuente | Tipo | Licencia | Nota |
|--------|------|----------|------|
| [Dice Grimorium](https://dicegrimorium.com/free-rpg-map-library/) | Battle maps gridded | Uso libre personal | No redistribuir |
| [Velázquez Portraits (OpenGameArt)](https://opengameart.org/content/30-painted-portraits) | Retratos | Dominio público (pinturas clásicas) | Libre |

URLs viejas del plan original (2minutetabletop, itch.io manual) están muertas o
requieren descarga manual — no usar.

## Regenerar

PowerShell (Windows). **Importante**: siempre pedir variante `-1024x1536` o similar;
las conexiones a Dice Grimorium se cortan a menudo con los archivos `-scaled`
grandes y quedan JPEGs truncados sin error visible en curl.

```powershell
$ua = 'Mozilla/5.0'
curl.exe -sL --retry 3 -A $ua -o tests/assets/maps/tavern-1536.jpg `
  "https://dicegrimorium.com/wp-content/uploads/<AÑO>/<MES>/<Nombre>-Gridded-WxH-MapPublic-1536x1024.jpg"
curl.exe -sL --retry 3 -A $ua -o tests/assets/portraits/velazquez.tar.bz2 `
  "https://opengameart.org/sites/default/files/velazquez_portraits.tar.bz2"
tar -xjf tests/assets/portraits/velazquez.tar.bz2 -C tests/assets/portraits
Remove-Item tests/assets/portraits/velazquez.tar.bz2
```

### Validar que no estén truncados

Un JPEG cortado decodifica parcial en el browser y produce pantalla negra con
`WebGL INVALID_VALUE: texSubImage2D: bad image data`. Validar SIEMPRE después de
descargar:

```powershell
Add-Type -AssemblyName System.Drawing
Get-ChildItem tests/assets -Recurse -Include *.jpg,*.png | ForEach-Object {
  try {
    $img = [System.Drawing.Image]::FromFile($_.FullName); $img.Dispose()
  } catch { Write-Warning "CORRUPTO: $($_.Name)" }
}
# Si GDI+ imprime "Corrupt JPEG data: premature end of data segment" → re-descargar.
```

El test `D9` (dashboard.spec.ts) verifica además en runtime que las texturas
decodifican con variedad de colores y sin errores WebGL.
