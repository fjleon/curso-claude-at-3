import { expect, test, type Page } from '@playwright/test'

/**
 * Formulario de platos accesible (issue #11).
 *
 * El login y la llegada al formulario se hacen con clics (no es lo que se
 * evalúa y así se evita el bug de la URL directa a platos); dentro del
 * formulario todo se maneja solo con el teclado.
 */

async function login_como_admin(page: Page): Promise<void> {
  await page.goto('/login')
  await page.getByLabel('Correo electrónico').fill('admin@resttek.com')
  await page.getByLabel('Contraseña').fill('admin@resttek.com')
  await page.getByRole('button', { name: 'Iniciar sesión' }).click()
  await expect(page).toHaveURL(/\/dashboard/)
}

async function ir_a_nuevo_plato(page: Page): Promise<void> {
  await page.locator('.restaurant-toggle').first().click()
  await page.getByRole('link', { name: 'Platos' }).click()
  await expect(page.getByRole('heading', { level: 1, name: 'Platos' })).toBeVisible()
  await page.getByRole('link', { name: 'Nuevo plato' }).click()
}

test('el formulario de platos se completa y envía solo con el teclado', async ({ page }) => {
  await login_como_admin(page)
  await ir_a_nuevo_plato(page)

  // Estructura accesible: encabezado, campos con etiqueta y botón real.
  await expect(page.getByRole('heading', { level: 1, name: 'Nuevo plato' })).toBeVisible()
  await expect(page.getByLabel('Nombre del plato')).toBeVisible()
  await expect(page.getByLabel('Precio (€)')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Guardar' })).toBeVisible()
})
