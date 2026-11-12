import path from 'node:path'
import { expect, test, type APIRequestContext, type Page } from '@playwright/test'

/**
 * Gestión de mesas (issue #5): un cliente elige restaurante, indica el número
 * de personas, ocupa una mesa libre con capacidad suficiente y envía su pedido,
 * que queda asociado a esa mesa.
 *
 * Requiere `npm run seed` (mesas table-rest-1-1..6, la nº 5 ocupada).
 */

const VIDEO_PATH = path.join(__dirname, 'videos', 'cliente-mesa-pedido.webm')
const API = 'http://localhost:3000/api/v1'
const RESTAURANT_ID = 'rest-1'
const MESA_ELEGIDA = 4

async function token(request: APIRequestContext, email: string): Promise<string> {
  const res = await request.post(`${API}/auth/login`, { data: { email, password: email } })
  expect(res.ok(), `login de ${email}`).toBeTruthy()
  return (await res.json()).token
}

/** Deja libres las mesas del seed (salvo la 5) para que la prueba sea repetible. */
async function liberar_mesas(request: APIRequestContext): Promise<void> {
  const adminToken = await token(request, 'admin@resttek.com')
  for (const n of [1, 2, 3, 4, 6]) {
    const res = await request.patch(`${API}/restaurants/${RESTAURANT_ID}/tables/table-rest-1-${n}/status`, {
      headers: { Authorization: `Bearer ${adminToken}` },
      data: { status: 'libre' }
    })
    expect(res.status(), `liberar mesa ${n}`).toBe(200)
  }
}

async function login_como_cliente(page: Page): Promise<void> {
  await page.goto('/login')
  await page.getByLabel('Correo electrónico').fill('cliente1@resttek.com')
  await page.getByLabel('Contraseña').fill('cliente1@resttek.com')
  await page.getByRole('button', { name: 'Iniciar sesión' }).click()
  await expect(page).toHaveURL(/\/restaurants$/)
}

test.beforeEach(async ({ request }) => {
  await liberar_mesas(request)
})

test('un cliente ocupa una mesa para 3 personas y envía su pedido a esa mesa', async ({ page, request }, testInfo) => {
  await login_como_cliente(page)

  // 1. Elige restaurante → pasa al paso de selección de mesa.
  await page.getByRole('heading', { name: 'Restaurante El Gourmet' }).click()
  await expect(page).toHaveURL(new RegExp(`/restaurants/${RESTAURANT_ID}/table$`))
  await expect(page.getByText('Indica cuántas personas sois')).toBeVisible()

  // 2. Indica 3 personas y busca: solo mesas libres con capacidad >= 3, ordenadas por capacidad.
  await page.getByLabel('Número de personas').fill('3')
  await page.getByRole('button', { name: 'Buscar mesas' }).click()
  const mesas = page.locator('.table-card strong')
  await expect(mesas).toHaveText(['Mesa 3', 'Mesa 4', 'Mesa 6'])

  // 3. Elige la mesa 4 y continúa → la mesa queda ocupada y va a la carta.
  await page.getByRole('button', { name: new RegExp(`Mesa ${MESA_ELEGIDA}\\b`) }).click()
  await page.getByRole('button', { name: 'Continuar' }).click()
  await expect(page).toHaveURL(new RegExp(`/restaurants/${RESTAURANT_ID}$`))
  await expect(page.getByText(`Mesa ${MESA_ELEGIDA} ·`)).toBeVisible()

  // 4. Añade dos platos a la carta y va al carrito.
  const anadir = page.getByRole('button', { name: 'Añadir' })
  await anadir.nth(0).click()
  await anadir.nth(1).click()
  await page.getByRole('link', { name: /Ver carrito/ }).click()
  await expect(page.getByRole('heading', { level: 1, name: 'Tu pedido' })).toBeVisible()
  await expect(page.getByText(`Mesa ${MESA_ELEGIDA}`).first()).toBeVisible()

  // 5. Confirma el pedido: se crea con el tableId de la mesa elegida.
  const [respuesta] = await Promise.all([
    page.waitForResponse(r => r.url().endsWith('/api/v1/orders') && r.request().method() === 'POST'),
    page.getByRole('button', { name: 'Confirmar pedido' }).click()
  ])
  expect(respuesta.status()).toBe(201)
  const pedido = await respuesta.json()
  expect(pedido.tableId).toBe(`table-rest-1-${MESA_ELEGIDA}`)
  await expect(page).toHaveURL(new RegExp(`/orders/${pedido.id}$`))
  await expect(page.getByRole('heading', { level: 1, name: /Pedido #/ })).toBeVisible()
  await page.waitForTimeout(1500)

  // La mesa sigue ocupada en la API.
  const camareroToken = await token(request, 'camarero1@resttek.com')
  const mesa = await request.get(`${API}/restaurants/${RESTAURANT_ID}/tables/table-rest-1-${MESA_ELEGIDA}`, {
    headers: { Authorization: `Bearer ${camareroToken}` }
  })
  expect((await mesa.json()).status).toBe('ocupada')

  const video = page.video()
  await page.close()
  if (video && testInfo.status === testInfo.expectedStatus) {
    await video.saveAs(VIDEO_PATH)
  }
})
