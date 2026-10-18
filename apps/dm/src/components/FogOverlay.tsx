import { useEffect, useMemo } from 'react'
import * as THREE from 'three'
import { FogRegion } from '../lib/fogMask'
import type { PerceptionMask } from '../lib/playerPerception'

export const FOG_MASK_SIZE = 512

/**
 * Las dos pintadas usan el tamaño que YA tiene el canvas: no lo redimensionan.
 *
 * Redimensionar después de la primera subida de la textura la rompe. Three solo
 * usa `texImage2D` en la primera subida; para las siguientes va por
 * `texSubImage2D`, y si el canvas cambió de tamaño el offset desborda
 * (`GL_INVALID_VALUE: ... Offset overflows texture dimensions`) y la niebla deja
 * de pintarse sin ningún error visible en la app. Por eso el canvas nace con su
 * tamaño final y, si el aspect del mapa cambia, se crea otra textura.
 */

/** Traza la línea central de una región con el grosor del pincel. */
function traceStroke(ctx: CanvasRenderingContext2D, r: FogRegion, w: number, h: number) {
  ctx.beginPath()
  for (let i = 0; i + 1 < r.points.length; i += 2) {
    const px = r.points[i] * w
    const py = r.points[i + 1] * h
    if (i === 0) ctx.moveTo(px, py)
    else ctx.lineTo(px, py)
  }
  // Un trazo de un solo punto es un punto: `stroke()` no pinta nada, hay que
  // terminar en el mismo lugar para que la tapa redonda lo cubra.
  if (r.points.length === 2) ctx.lineTo(r.points[0] * w, r.points[1] * h)
}

function paintMask(canvas: HTMLCanvasElement, color: string, regions: FogRegion[]) {
  const w = canvas.width
  const h = canvas.height
  const ctx = canvas.getContext('2d')
  if (!ctx) return

  ctx.globalCompositeOperation = 'source-over'
  ctx.clearRect(0, 0, w, h)
  ctx.fillStyle = color
  ctx.fillRect(0, 0, w, h)

  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'

  // Los secretos van a un canvas aparte y se componen de una sola vez: sin esto
  // un trazo largo solapa sus propias partes y el alpha se acumula en cada una.
  const secrets = regions.filter((r) => r.secret)
  if (secrets.length > 0) {
    const hint = document.createElement('canvas')
    hint.width = w
    hint.height = h
    const hctx = hint.getContext('2d')
    if (hctx) {
      hctx.strokeStyle = '#f59e0b'
      hctx.lineWidth = Math.max(2, Math.round(Math.min(w, h) / 180))
      hctx.setLineDash([12, 9])
      hctx.lineCap = 'round'
      hctx.lineJoin = 'round'
      for (const r of secrets) {
        if (r.brushRadius !== undefined) {
          // El contorno de un trazo son sus dos bordes; el del medio seria un
          // tubo naranja en el medio de la niebla, que no dice nada.
          hctx.lineWidth = Math.max(2, r.brushRadius * 2 * w)
          hctx.beginPath()
          for (let i = 0; i + 1 < r.points.length; i += 2) {
            const px = r.points[i] * w
            const py = r.points[i + 1] * h
            if (i === 0) hctx.moveTo(px, py)
            else hctx.lineTo(px, py)
          }
          hctx.stroke()
          continue
        }
        traceStroke(hctx, r, w, h)
        hctx.closePath()
        hctx.stroke()
      }
      ctx.globalAlpha = 0.85
      ctx.drawImage(hint, 0, 0)
      ctx.globalAlpha = 1
    }
  }

  const order = [...regions].sort((a, b) => a.zIndex - b.zIndex)
  for (const r of order) {
    if (r.secret) continue

    if (r.brushRadius !== undefined) {
      ctx.globalCompositeOperation = r.revealed ? 'destination-out' : 'source-over'
      ctx.strokeStyle = r.revealed ? '#000000' : color
      ctx.lineWidth = Math.max(1, r.brushRadius * 2 * w)
      traceStroke(ctx, r, w, h)
      ctx.stroke()
      continue
    }

    traceStroke(ctx, r, w, h)
    ctx.closePath()
    if (r.revealed) {
      ctx.globalCompositeOperation = 'destination-out'
      ctx.fillStyle = '#000000'
      ctx.fill()
    } else {
      ctx.globalCompositeOperation = 'source-over'
      ctx.fillStyle = color
      ctx.fill()
    }
  }
  ctx.globalCompositeOperation = 'source-over'
}

/**
 * Pinta el alpha de percepción como textura de niebla.
 *
 * Sin orden de pintado y sin `zIndex`: la niebla del DM y la visión del jugador
 * ya venían resueltas en una sola rejilla (`playerPerception.ts`), así que acá
 * solo se traduce a píxeles. Se rellena con el color de niebla y la máscara se
 * perfora con `destination-out`, que es lo mismo que hacía `paintMask` con las
 * regiones reveladas pero con alpha continuo (el `dimRange` de la visión).
 *
 * El alpha va **tal cual**: `destination-out` perfora, así que alpha 1 = agujero
 * = se ve de plano. Invertirlo dejaba el mapa al revés (niebla donde el
 * personaje ve, claridad donde no ve) y era indistinguible de "no sincroniza".
 *
 * `[row][col]` va hacia abajo en el canvas, igual que `paintMask` mapeaba los
 * puntos normalizados, así que la convención de ejes no cambia entre los dos.
 */
function paintPerception(canvas: HTMLCanvasElement, color: string, mask: PerceptionMask) {
  const w = canvas.width
  const h = canvas.height
  const ctx = canvas.getContext('2d')
  if (!ctx || mask.cols <= 0 || mask.rows <= 0) return

  const src = document.createElement('canvas')
  src.width = mask.cols
  src.height = mask.rows
  const sctx = src.getContext('2d')
  if (!sctx) return
  const img = sctx.createImageData(mask.cols, mask.rows)
  for (let i = 0; i < mask.data.length; i++) {
    const v = mask.data[i]
    const a = v < 0 ? 0 : v > 1 ? 255 : Math.round(v * 255)
    const o = i * 4
    img.data[o] = 255
    img.data[o + 1] = 255
    img.data[o + 2] = 255
    img.data[o + 3] = a
  }
  sctx.putImageData(img, 0, 0)

  ctx.globalCompositeOperation = 'source-over'
  ctx.clearRect(0, 0, w, h)
  ctx.fillStyle = color
  ctx.fillRect(0, 0, w, h)
  ctx.globalCompositeOperation = 'destination-out'
  ctx.imageSmoothingEnabled = true
  ctx.drawImage(src, 0, 0, w, h)
  ctx.globalCompositeOperation = 'source-over'
}

interface FogOverlayProps {
  regions: FogRegion[]
  /**
   * Alpha de percepción del jugador. Cuando viene, manda sobre `regions`: es la
   * ruta del jugador (una sola rejilla) y la del DM sigue siendo por polígonos
   * (`engineering/PLAN-VISION-PERCEPCION.md` §4.3: el DM ve todo).
   */
  perception?: PerceptionMask | null
  /**
   * Si la niebla tiene que pintar POR ENCIMA de tokens y modelos 3D.
   *
   * Solo el jugador: para él la niebla es lo que separa "veo" de "no veo", así
   * que un token parado en una zona secreta no puede asomar. El DM la deja en
   * `false` porque el §4.3 dice que el DM ve todo, y con `true` en un mapa 3D el
   * plano de y=6 le tapaba sus propios modelos y se quedaba a ciegas en la mesa
   * que está preparando.
   */
  paintsOverContent?: boolean
  color: string
  mapWidth: number
  mapHeight: number
  renderMode?: import('@/lib/overlayY').RenderMode
}

export default function FogOverlay({
  regions,
  perception = null,
  paintsOverContent = false,
  color,
  mapWidth,
  mapHeight,
  renderMode = '2d',
}: FogOverlayProps) {
  const aspect = mapHeight > 0 ? mapWidth / mapHeight : 1
  const fogY = renderMode === '2d' ? 0.08 : 6

  // El tamaño va en la clave: si el aspect del mapa cambia (o se carga el fondo
  // tarde) es OTRA textura, con su propia subida correcta.
  const texture = useMemo(() => {
    const canvas = document.createElement('canvas')
    canvas.width = FOG_MASK_SIZE
    canvas.height = Math.max(32, Math.round(FOG_MASK_SIZE / aspect))
    const tex = new THREE.CanvasTexture(canvas)
    tex.needsUpdate = true
    return tex
  }, [aspect])

  useEffect(() => () => texture.dispose(), [texture])

  useEffect(() => {
    const canvas = texture.image as HTMLCanvasElement
    if (perception) paintPerception(canvas, color, perception)
    else paintMask(canvas, color, regions)
    texture.needsUpdate = true
  }, [texture, color, regions, perception])

  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, fogY, 0]} renderOrder={50}>
      <planeGeometry args={[mapWidth, mapHeight]} />
      {/*
        `depthTest: false` a propósito: la niebla tiene que tapar TODO lo que hay
        en el mapa, incluidos los tokens (que en 2D flotan en y≈0.6) y los modelos
        3D (que en 3D están en y=6 o más). Con el test de profundidad la niebla se
        perdía justo detrás de ellos: el jugador veía al NPC parado en una zona
        secreta.
      */}
      <meshBasicMaterial
        map={texture}
        transparent
        depthWrite={false}
        depthTest={!paintsOverContent}
        toneMapped={false}
      />
    </mesh>
  )
}