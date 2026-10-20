import { expect, test } from '../fixtures/campaign-fixture';
import {
  createCharacter,
  createScene,
  generateInviteCode,
  getSceneItems,
  putSceneItems,
  seedTokens,
  updateScene,
  uploadBackground,
  PNG_1PX,
  PNG_LIGHT_CHECKER,
} from '../helpers/api-helpers';
import { brightnessInRegion, maxBrightnessInRegion, pixelBrightness, readViewPixel } from '../helpers/pixels';

/** Antorcha en el centro del mapa: ilumina toda la sala. */
function centerTorch() {
  return {
    id: 'light-f5',
    name: 'Torch',
    x: 0,
    y: 0,
    width: 0,
    height: 0,
    layer: 5,
    visible: true,
    metadata: {
      type: 'light',
      source: { mode: 'soft', color: '#ff9d45', intensity: 0.9, radius: 0.4, falloff: 0.6 },
    },
  };
}

async function openScene(page: import('@playwright/test').Page, campaignId: string, sceneId: string) {
  await page.goto(`/campaigns/${campaignId}`);
  await page.locator('header select').selectOption(sceneId);
  await page.setInputFiles('[data-testid="bg-upload-input"]', {
    name: 'bg.png',
    mimeType: 'image/png',
    buffer: PNG_1PX,
  });
  const canvas = page.locator('canvas').first();
  await expect(canvas).toBeVisible({ timeout: 15_000 });
  await page.waitForFunction(
    () =>
      !Array.from(document.querySelectorAll('div')).some(
        (d) => d.textContent === 'Loading 3D scene...' && d.className.includes('w-full'),
      ) && !!document.querySelector('canvas'),
    undefined,
    { timeout: 15_000 },
  );
  await page.waitForTimeout(1500);
  return canvas;
}

function fogPolygon(id: string, revealed: boolean, cx: number, cy: number, r: number, mode?: string) {
  const pts: number[] = [];
  for (let i = 0; i < 16; i++) {
    const a = (i / 16) * Math.PI * 2;
    pts.push(cx + Math.cos(a) * r, cy + Math.sin(a) * r);
  }
  return {
    id,
    name: 'Fog',
    x: 0,
    y: 0,
    zIndex: 0,
    scale: 1,
    rotation: 0,
    width: 0,
    height: 0,
    opacity: 1,
    visible: true,
    locked: false,
    disableHit: false,
    disableAutoZIndex: false,
    attachmentIds: [],
    disableAttachmentBehavior: [],
    layer: 6,
    shape: { type: 'polygon', points: pts, fill: '#000000' },
    metadata: { type: 'fog', fogType: 'static', revealed, ...(mode ? { mode } : {}) },
  };
}

function fogItems(items: import('../helpers/api-helpers').SceneItem[]) {
  return items.filter((i) => i.metadata?.type === 'fog');
}

/**
 * POV de jugador listo para mirar la pantalla: escena con fondo claro, token con
 * darkvision amplia (así la vision no tapa el efecto de la niebla) y la máscara
 * ya calculada.
 *
 * El fondo tiene que ser claro a propósito: si fuera oscuro, "niebla" y "mapa"
 * darían el mismo brillo y la aserción pasaría siempre.
 */
async function openPlayerWithLightMap(
  page: import('@playwright/test').Page,
  campaignId: string,
  sceneId: string,
  charName: string,
  code: string,
) {
  await page.goto(`/campaigns/join/${code}`);
  await page.getByRole('button', { name: new RegExp(charName) }).click();
  const mask = page.getByTestId('perception-mask');
  await expect
    .poll(async () => Number(await mask.getAttribute('data-cols')), { timeout: 25_000 })
    .toBeGreaterThan(0);
  return mask;
}

test.describe('Fog (Phase D)', () => {
  test('F1: regions de niebla inyectadas sobreviven roundtrip y no rompen render', async ({
    page,
    campaign,
    request,
  }) => {
    const scene = await createScene(request, campaign.id, 'Fog Inject');
    await putSceneItems(request, campaign.id, scene.id, [
      fogPolygon('fog-e2e-1', false, 0.3, 0.3, 0.1),
      fogPolygon('fog-e2e-2', true, 0.6, 0.6, 0.12),
    ]);
    const errors: string[] = [];
    page.on('pageerror', (err) => errors.push(err.message));

    await openScene(page, campaign.id, scene.id);

    expect(errors).toHaveLength(0);
    const { items } = await getSceneItems(request, campaign.id, scene.id);
    const fogs = fogItems(items);
    expect(fogs).toHaveLength(2);
    expect((fogs.find((f) => f.id === 'fog-e2e-2')?.metadata as { revealed: boolean }).revealed).toBe(true);
  });

  test('F2: pincel de niebla pinta regiones y persisten', async ({
    page,
    campaign,
    request,
  }) => {
    const scene = await createScene(request, campaign.id, 'Fog Brush');
    const canvas = await openScene(page, campaign.id, scene.id);

    await page.getByTestId('layers-toggle').click();
    await page.getByRole('button', { name: /Niebla \(pincel\)/ }).click();
    await expect(page.getByText(/Arrastrá para pintar niebla/)).toBeVisible();

    const box = await canvas.boundingBox();
    if (!box) throw new Error('canvas sin boundingBox');

    const putPromise = page.waitForResponse(
      (res) =>
        res.url().includes(`/scenes/${scene.id}/items`) && res.request().method() === 'PUT',
      { timeout: 20_000 },
    );

    const cx = box.x + box.width * 0.5;
    const cy = box.y + box.height * 0.5;
    await page.mouse.move(cx - box.width * 0.1, cy);
    await page.mouse.down();
    await page.mouse.move(cx, cy, { steps: 8 });
    await page.mouse.move(cx + box.width * 0.1, cy, { steps: 8 });
    await page.mouse.up();

    const response = await putPromise;
    expect(response.status()).toBe(200);

    const { items } = await getSceneItems(request, campaign.id, scene.id);
    const fogs = fogItems(items);
    // UN item por pincelada. Antes sellaba un círculo por punto de mouse y este
    // drag dejaba ~25 items: cada uno un mesh, una fila de `items_json` que
    // viaja entero a cada jugador, y un turno de `buildDmFogGrid`.
    expect(fogs).toHaveLength(1);
    for (const f of fogs) {
      const pts = (f.shape as { points?: number[] }).points ?? [];
      // La línea central del trazo, muestreada: al menos un par de puntos (x,y).
      expect(pts.length % 2).toBe(0);
      expect(pts.length).toBeGreaterThanOrEqual(4);
      for (const p of pts) {
        expect(p).toBeGreaterThanOrEqual(0);
        expect(p).toBeLessThanOrEqual(1);
      }
      // El grosor va en `brushRadius`; su presencia es lo que dice "esto es un
      // trazo" y no un polígono relleno.
      const radius = (f.metadata as { brushRadius?: number }).brushRadius;
      expect(typeof radius).toBe('number');
      expect(radius).toBeGreaterThan(0);
      expect(radius).toBeLessThanOrEqual(0.2);
      // El pincel entra en modo `secret` (oculta por defecto: es lo que el DM espera
      // que haga la niebla). El tooltip explica el matiz de cada modo.
      expect((f.metadata as { mode?: string }).mode).toBe('secret');
      expect((f.metadata as { revealed: boolean }).revealed).toBe(false);
    }
  });

  test('F9: el DM ve su mapa a través de la niebla, el jugador no', async ({
    page,
    campaign,
    request,
  }) => {
    // El plano de niebla va con `depthTest: false` para que le tapare al
    // jugador los tokens (si no, un NPC en una zona secreta se ve igual). Pero
    // el DM tiene que ver TODO lo que está preparando: con el mismo material se
    // quedaba a ciegas en su propia mesa. Por eso `paintsOverContent` es del
    // jugador, no del plano.
    const scene = await createScene(request, campaign.id, 'Fog DM vs jugador');
    await uploadBackground(request, campaign.id, scene.id, {
      name: 'bg.png',
      mimeType: 'image/png',
      buffer: PNG_LIGHT_CHECKER,
    });
    const char = await createCharacter(request, campaign.id, { name: 'Vane' });
    await seedTokens(request, campaign.id, scene.id, [
      { entityType: 'character', entityId: char.id, x: 0, z: 0, visionType: 'darkvision', visionRange: 14 },
    ]);
    await updateScene(request, campaign.id, scene.id, { status: 'active' });

    // 1) El DM pinta niebla secreta sobre todo el mapa. Es el único modo que
    //    oculta de verdad en las DOS vistas: `cover` no le gana a nada para el
    //    jugador (deja su percepción como está), así que con `cover` este test
    //    no probaría el depth test, probaría la semántica del modo.
    await putSceneItems(request, campaign.id, scene.id, [
      fogPolygon('fog-f9-secret', false, 0.5, 0.5, 0.75, 'secret'),
    ]);

    // 2) El DM: su mesa no se vela. Es el §4.3 ("el DM ve todo"): si el plano de
    //    niebla tapara también lo que está por encima, el DM se quedaría a ciegas
    //    en la zona que acaba de preparar.
    //
    //    Lo que está en riesgo es lo que vive ARRIBA del plano (tokens en y≈0.6,
    //    modelos 3D en y=6+); el suelo está debajo y nunca estuvo en riesgo. Por
    //    eso la aserción es el máximo del centro, que es donde cae el token. No
    //    se mide el fondo con un promedio: el mapa se dibuja en trapecio y el
    //    resto del canvas es el clear color con alpha 1, así que un promedio de
    //    esa región depende de cómo cae el rectángulo y cambia entre máquinas.
    await openScene(page, campaign.id, scene.id);
    const dToken = await maxBrightnessInRegion(page, 0.4, 0.4, 0.65, 0.7);
    expect(dToken, 'el DM ve su token por encima de su propio secreto').toBeGreaterThan(150);

    // 3) El jugador: la misma escena, la misma niebla, nada asoma. Acá sí se
    //    puede mirar el promedio de una franja de mapa: está todo velado, así
    //    que cualquier umbral bajo sirve y el void no importa.
    const code = await generateInviteCode(request, campaign.id);
    const mask = await openPlayerWithLightMap(page, campaign.id, scene.id, 'Vane', code);
    await expect
      .poll(async () => Number(await mask.getAttribute('data-visible-cells')), { timeout: 20_000 })
      .toBe(0);
    await expect
      .poll(async () => (await brightnessInRegion(page, 0.6, 0.25, 0.9, 0.55)).avg, { timeout: 20_000 })
      .toBeLessThan(90);
    await expect
      .poll(async () => maxBrightnessInRegion(page, 0.4, 0.4, 0.65, 0.7), { timeout: 20_000 })
      .toBeLessThan(90);
  });

  test('F5: el modo Secreto guarda el mode y el jugador no ve esa zona', async ({
    page,
    campaign,
    request,
  }) => {
    // El caso que el plan de percepción dice que hoy no pasa: la niebla del DM no
    // le oculta nada al jugador (su visión ganaba por zIndex). Con `secret` la
    // zona queda negra aunque el personaje la ilumine.
    const scene = await createScene(request, campaign.id, 'Fog Secreto');
    const char = await createCharacter(request, campaign.id, { name: 'Vane' });
    await seedTokens(request, campaign.id, scene.id, [
      { entityType: 'character', entityId: char.id, x: 0, z: 0 },
    ]);
    await putSceneItems(request, campaign.id, scene.id, [centerTorch()]);
    await updateScene(request, campaign.id, scene.id, { status: 'active' });
    const code = await generateInviteCode(request, campaign.id);

    // 1) Luz en el centro y nada de niebla: el jugador ve celdas.
    await page.goto(`/campaigns/join/${code}`);
    await page.getByRole('button', { name: /Vane/ }).click();
    const mask = page.getByTestId('perception-mask');
    await expect.poll(async () => Number(await mask.getAttribute('data-cols')), { timeout: 20_000 }).toBeGreaterThan(0);
    expect(Number(await mask.getAttribute('data-visible-cells'))).toBeGreaterThan(0);

    // 2) El DM pinta secreto encima, sin tocar la luz → 0 celdas vistas. El radio
    // cubre el mapa entero (la esquina del cuadrado normalizado está a 0.707).
    await putSceneItems(request, campaign.id, scene.id, [
      centerTorch(),
      fogPolygon('fog-secret-f5', false, 0.5, 0.5, 0.75, 'secret'),
    ]);

    await page.reload();
    // No hay que volver a elegir: la elección persiste (ver PV5).
    await expect.poll(async () => Number(await mask.getAttribute('data-cols')), { timeout: 20_000 }).toBeGreaterThan(0);
    await expect.poll(async () => Number(await mask.getAttribute('data-visible-cells')), { timeout: 20_000 }).toBe(0);

    // 3) El dato persistió con el modo nuevo.
    const { items } = await getSceneItems(request, campaign.id, scene.id);
    expect((fogItems(items)[0].metadata as { mode?: string }).mode).toBe('secret');
  });

  test('F3: Clear all fog elimina todas las regiones', async ({
    page,
    campaign,
    request,
  }) => {
    const scene = await createScene(request, campaign.id, 'Fog Clear');
    await putSceneItems(request, campaign.id, scene.id, [
      fogPolygon('fog-e2e-c1', false, 0.3, 0.3, 0.1),
      fogPolygon('fog-e2e-c2', true, 0.6, 0.6, 0.12),
    ]);
    await openScene(page, campaign.id, scene.id);

    const putPromise = page.waitForResponse(
      (res) =>
        res.url().includes(`/scenes/${scene.id}/items`) && res.request().method() === 'PUT',
      { timeout: 20_000 },
    );
    await page.getByTestId('layers-toggle').click();
    await page.getByRole('button', { name: /Limpiar toda la niebla/ }).click();
    await expect(page.getByText(/regiones de niebla eliminadas/)).toBeVisible({ timeout: 10_000 });
    await putPromise;

    const { items } = await getSceneItems(request, campaign.id, scene.id);
    expect(fogItems(items)).toHaveLength(0);
  });

  test('F4: Zone fog toggle cubre y descubre una ShadowZone', async ({
    page,
    campaign,
    request,
  }) => {
    const scene = await createScene(request, campaign.id, 'Fog Zone Toggle');
    const zone: import('../helpers/api-helpers').SceneItem = {
      id: 'zone-e2e-f4',
      name: 'Sala Central',
      x: 0,
      y: 0,
      zIndex: 0,
      scale: 1,
      rotation: 0,
      width: 0,
      height: 0,
      opacity: 1,
      visible: true,
      locked: false,
      disableHit: false,
      disableAutoZIndex: false,
      attachmentIds: [],
      disableAttachmentBehavior: [],
      layer: 4,
      shape: { type: 'polygon', points: [0.3, 0.3, 0.6, 0.3, 0.6, 0.6, 0.3, 0.6], fill: '#334155' },
      metadata: {
        type: 'zone',
        zoneType: 'polygon',
        origin: 'manual',
        touchedByDm: true,
        shadowOnly: false,
        fillColor: '#334155',
        fillOpacity: 0.2,
        portals: [],
      },
    };
    await putSceneItems(request, campaign.id, scene.id, [zone]);
    const canvas = await openScene(page, campaign.id, scene.id);
    const box = await canvas.boundingBox();
    if (!box) throw new Error('canvas sin boundingBox');

    const putPromise = page.waitForResponse(
      (res) =>
        res.url().includes(`/scenes/${scene.id}/items`) && res.request().method() === 'PUT',
      { timeout: 20_000 },
    );
    await page.getByTestId('layers-toggle').click();
    await page.getByRole('button', { name: /Niebla de zona/ }).click();
    await expect(page.getByText(/Clic dentro de una zona para alternar niebla/)).toBeVisible();
    const cx = box.x + box.width * (0.3 + 0.15);
    const cy = box.y + box.height * (0.3 + 0.15);
    await page.mouse.click(cx, cy);
    await putPromise;
    await expect(page.getByText(/niebla cubriendo la zona/)).toBeVisible({ timeout: 10_000 });

    let { items } = await getSceneItems(request, campaign.id, scene.id);
    const fogAfterHide = fogItems(items);
    expect(fogAfterHide).toHaveLength(1);
    expect((fogAfterHide[0].metadata as { revealed: boolean }).revealed).toBe(false);
    // `secret`: con `cover` el jugador no veía diferencia ninguna al "cubrir".
    expect((fogAfterHide[0].metadata as { mode?: string }).mode).toBe('secret');
    const pts = (fogAfterHide[0].shape as { points?: number[] }).points ?? [];
    expect(pts.length % 2).toBe(0);
    for (const p of pts) {
      expect(p).toBeGreaterThanOrEqual(0);
      expect(p).toBeLessThanOrEqual(1);
    }

    const putPromise2 = page.waitForResponse(
      (res) =>
        res.url().includes(`/scenes/${scene.id}/items`) && res.request().method() === 'PUT',
      { timeout: 20_000 },
    );
    await page.mouse.click(cx, cy);
    await putPromise2;
    await expect(page.getByText(/niebla despejada de la zona/)).toBeVisible({ timeout: 10_000 });

    ({ items } = await getSceneItems(request, campaign.id, scene.id));
    expect(fogItems(items)).toHaveLength(0);
    expect(items.some((i: import('../helpers/api-helpers').SceneItem) => i.id === 'zone-e2e-f4')).toBe(true);
  });

  test('F6: recuerda lo explorado al volver a entrar', async ({
    page,
    campaign,
    request,
  }) => {
    // Paso 6 de docs/engineering/PLAN-VISION-PERCEPCION.md: con remember_explored
    // encendido, el jugador conserva entre sesiones lo que ya vio.
    const scene = await createScene(request, campaign.id, 'Fog Memoria');
    const char = await createCharacter(request, campaign.id, { name: 'Vane' });
    await seedTokens(request, campaign.id, scene.id, [
      { entityType: 'character', entityId: char.id, x: 0, z: 0 },
    ]);
    await updateScene(request, campaign.id, scene.id, {
      status: 'active',
      remember_explored: true,
    });
    const code = await generateInviteCode(request, campaign.id);

    // 1) Sin luz, solo el círculo ambiente.
    await page.goto(`/campaigns/join/${code}`);
    await page.getByRole('button', { name: /Vane/ }).click();
    const mask = page.getByTestId('perception-mask');
    await expect.poll(async () => Number(await mask.getAttribute('data-cols')), { timeout: 20_000 }).toBeGreaterThan(0);
    const ambient = Number(await mask.getAttribute('data-visible-cells'));
    expect(ambient).toBeGreaterThan(0);

    // 2) El DM enciende una antorcha brillante: se ve mucho más y se acumula.
    await putSceneItems(request, campaign.id, scene.id, [centerTorch()]);
    await expect
      .poll(async () => Number(await mask.getAttribute('data-visible-cells')), { timeout: 20_000 })
      .toBeGreaterThan(ambient * 2);

    // 3) El DM apaga la antorcha y el jugador recarga. Sin memoria vería solo
    //    el ambiente; con remember_explored sigue viendo lo que exploró.
    await putSceneItems(request, campaign.id, scene.id, []);
    await page.reload();
    await expect
      .poll(async () => Number(await mask.getAttribute('data-visible-cells')), { timeout: 20_000 })
      .toBeGreaterThan(ambient * 2);
  });

  test('F7: la niebla del DM se ve en la PANTALLA del jugador, no solo en la máscara', async ({
    page,
    campaign,
    request,
  }) => {
    // F5 mira `data-visible-cells`, que es la máscara. Con la máscara bien
    // calculada y la textura rota, la niebla no se veía nada en pantalla y F5
    // pasaba igual. Estos dos tests miran los píxeles del canvas.
    const scene = await createScene(request, campaign.id, 'Fog Pantalla');
    await uploadBackground(request, campaign.id, scene.id, {
      name: 'bg.png',
      mimeType: 'image/png',
      buffer: PNG_LIGHT_CHECKER,
    });
    const char = await createCharacter(request, campaign.id, { name: 'Vane' });
    await seedTokens(request, campaign.id, scene.id, [
      { entityType: 'character', entityId: char.id, x: 0, z: 0, visionType: 'darkvision', visionRange: 14 },
    ]);
    await updateScene(request, campaign.id, scene.id, { status: 'active' });
    const code = await generateInviteCode(request, campaign.id);

    const mask = await openPlayerWithLightMap(page, campaign.id, scene.id, 'Vane', code);

    // 1) Sin niebla el mapa se ve de plano.
    expect(Number(await mask.getAttribute('data-visible-cells'))).toBeGreaterThan(0);
    await expect
      .poll(async () => pixelBrightness(await readViewPixel(page, 0.72, 0.4)), { timeout: 20_000 })
      .toBeGreaterThan(120);

    // 2) El DM pinta secreto sobre todo el mapa, en vivo (sin reload): la
    //    pantalla tiene que ponerse oscura.
    await putSceneItems(request, campaign.id, scene.id, [
      fogPolygon('fog-f7-secret', false, 0.5, 0.5, 0.75, 'secret'),
    ]);
    await expect
      .poll(async () => Number(await mask.getAttribute('data-visible-cells')), { timeout: 20_000 })
      .toBe(0);
    await expect
      .poll(async () => pixelBrightness(await readViewPixel(page, 0.72, 0.4)), { timeout: 20_000 })
      .toBeLessThan(90);

    // 3) Revelar lo saca, también en vivo.
    await putSceneItems(request, campaign.id, scene.id, [
      fogPolygon('fog-f7-reveal', true, 0.5, 0.5, 0.75, 'reveal'),
    ]);
    await expect
      .poll(async () => pixelBrightness(await readViewPixel(page, 0.72, 0.4)), { timeout: 20_000 })
      .toBeGreaterThan(120);
  });

  test('F8: la niebla también tapa al token parado en la zona secreta', async ({
    page,
    campaign,
    request,
  }) => {
    // El plano de niebla está en y=0.08 y los tokens en y≈0.6: con el test de
    // profundidad el token se veía por encima de la niebla, así que el jugador
    // veía a un NPC parado en una zona secreta.
    const scene = await createScene(request, campaign.id, 'Fog Token');
    await uploadBackground(request, campaign.id, scene.id, {
      name: 'bg.png',
      mimeType: 'image/png',
      buffer: PNG_LIGHT_CHECKER,
    });
    const char = await createCharacter(request, campaign.id, { name: 'Vane' });
    await seedTokens(request, campaign.id, scene.id, [
      { entityType: 'character', entityId: char.id, x: 0, z: 0, visionType: 'darkvision', visionRange: 14 },
    ]);
    await updateScene(request, campaign.id, scene.id, { status: 'active' });
    const code = await generateInviteCode(request, campaign.id);

    const mask = await openPlayerWithLightMap(page, campaign.id, scene.id, 'Vane', code);

    // fy=0.5 en coordenadas GL (origen abajo) es el medio de la pantalla, donde
    // cae el token (centro del mapa).
    await expect
      .poll(async () => pixelBrightness(await readViewPixel(page, 0.5, 0.5)), { timeout: 20_000 })
      .toBeGreaterThan(120);

    await putSceneItems(request, campaign.id, scene.id, [
      fogPolygon('fog-f8-secret', false, 0.5, 0.5, 0.75, 'secret'),
    ]);

    // La máscara es el dato; el píxel es la pantalla. Se esperan los dos: si la
    // máscara baja y el píxel no, es un bug de render y no de sincronización.
    await expect
      .poll(async () => Number(await mask.getAttribute('data-visible-cells')), { timeout: 20_000 })
      .toBe(0);
    await expect
      .poll(async () => pixelBrightness(await readViewPixel(page, 0.5, 0.5)), { timeout: 20_000 })
      .toBeLessThan(90);
  });
});