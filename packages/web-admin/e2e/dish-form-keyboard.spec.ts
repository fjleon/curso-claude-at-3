import path from 'node:path'
import { expect, test, type Locator, type Page } from '@playwright/test'

/**
 * Formulario de platos accesible (issue #11).
 *
 * El login y la llegada al formulario se hacen con clics (no es lo que se
 * evalúa y así se evita el bug de la URL directa a platos); dentro del
 * formulario todo se maneja solo con el teclado.
 */

const VIDEO_PATH = path.join(__dirname, 'videos', 'dish-form-keyboard.webm')

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

/** Pulsa una tecla y comprueba que el foco queda en el elemento esperado. */
async function pulsar_y_enfocar(page: Page, key: string, target: Locator): Promise<void> {
  await page.keyboard.press(key)
  await expect(target).toBeFocused()
}

/** Pulsa la tecla repetidamente hasta que el foco llegue al elemento (máx. `max` veces). */
async function mover_foco_hasta(page: Page, key: string, target: Locator, max = 15): Promise<void> {
  await expect(target).toBeVisible()
  for (let i = 0; i < max; i++) {
    if (await target.evaluate(el => el === document.activeElement)) return
    await page.keyboard.press(key)
  }
  await expect(target).toBeFocused()
}

async function reemplazar_texto(page: Page, text: string): Promise<void> {
  await page.keyboard.press('Control+A')
  await page.keyboard.type(text)
}

async function texto_seleccionado(select: Locator): Promise<string> {
  return select.evaluate(el => (el as HTMLSelectElement).selectedOptions[0]?.text ?? '')
}

test('el formulario de platos se completa y envía solo con el teclado', async ({ page }) => {
  const dishName = `Ensalada de la huerta ${Date.now()}`

  await login_como_admin(page)
  await ir_a_nuevo_plato(page)

  // Estructura accesible: encabezado, campos con etiqueta y botón real.
  await expect(page.getByRole('heading', { level: 1, name: 'Nuevo plato' })).toBeVisible()
  const name = page.getByLabel('Nombre del plato')
  const price = page.getByLabel('Precio (€)')
  const category = page.getByLabel('Categoría')
  const available = page.getByLabel('Disponible')
  const description = page.getByLabel('Descripción (opcional)')
  const ingredient = page.getByLabel('Ingrediente', { exact: true })
  const quantity = page.getByLabel('Cantidad', { exact: true })
  const addIngredient = page.getByRole('button', { name: 'Añadir ingrediente' })
  const cancel = page.getByRole('link', { name: 'Cancelar' })
  const save = page.getByRole('button', { name: 'Guardar' })
  const ingredientList = page.getByRole('list', { name: 'Ingredientes añadidos' })
  const liveRegion = page.locator('[aria-live="polite"]')

  // --- A partir de aquí, solo teclado ---
  // Punto de partida: el primer campo del formulario.
  await name.focus()

  // 1. Rellenar los datos siguiendo el orden de tabulación.
  await page.keyboard.type('Ensalada temporal')
  await pulsar_y_enfocar(page, 'Tab', price)
  await reemplazar_texto(page, '7.5')
  await pulsar_y_enfocar(page, 'Tab', category)
  await page.keyboard.type('Entrante')
  await expect(category).toHaveValue('entrante')
  await pulsar_y_enfocar(page, 'Tab', available)
  await pulsar_y_enfocar(page, 'Tab', description)
  await page.keyboard.type('Lechuga, tomate y aceite de oliva.')

  // 2. Volver atrás con Shift+Tab y modificar nombre y precio.
  await mover_foco_hasta(page, 'Shift+Tab', name)
  await reemplazar_texto(page, dishName)
  await pulsar_y_enfocar(page, 'Tab', price)
  await reemplazar_texto(page, '8.5')

  // 3. Añadir dos ingredientes: el primero con Enter en la cantidad,
  //    el segundo con el botón «Añadir ingrediente».
  await mover_foco_hasta(page, 'Tab', ingredient)
  await page.keyboard.press('ArrowDown')
  const firstIngredient = await texto_seleccionado(ingredient)
  await pulsar_y_enfocar(page, 'Tab', quantity)
  await reemplazar_texto(page, '2')
  await page.keyboard.press('Enter')
  await expect(ingredientList.getByRole('listitem')).toHaveCount(1)
  await expect(liveRegion).toContainText('añadido')
  await expect(ingredient).toBeFocused()

  await page.keyboard.press('ArrowDown')
  await page.keyboard.press('ArrowDown')
  const secondIngredient = await texto_seleccionado(ingredient)
  await pulsar_y_enfocar(page, 'Tab', quantity)
  await reemplazar_texto(page, '1')
  await pulsar_y_enfocar(page, 'Tab', addIngredient)
  await page.keyboard.press('Space')
  await expect(ingredientList.getByRole('listitem')).toHaveCount(2)
  await expect(ingredient).toBeFocused()

  // 4. Quitar el primer ingrediente: el foco pasa al siguiente botón «Quitar».
  const removeFirst = page.getByRole('button', { name: `Quitar ${firstIngredient}` })
  const removeSecond = page.getByRole('button', { name: `Quitar ${secondIngredient}` })
  await mover_foco_hasta(page, 'Tab', removeFirst)
  await page.keyboard.press('Enter')
  await expect(ingredientList.getByRole('listitem')).toHaveCount(1)
  await expect(ingredientList).not.toContainText(firstIngredient)
  await expect(liveRegion).toContainText('quitado')
  await expect(removeSecond).toBeFocused()

  // 5. Enviar el formulario incompleto (nombre vacío y precio 0).
  await mover_foco_hasta(page, 'Shift+Tab', name)
  await page.keyboard.press('Control+A')
  await page.keyboard.press('Delete')
  await pulsar_y_enfocar(page, 'Tab', price)
  await reemplazar_texto(page, '0')
  await page.keyboard.press('Enter')

  await expect(page.getByRole('alert')).toBeVisible()
  await expect(name).toHaveAttribute('aria-invalid', 'true')
  await expect(price).toHaveAttribute('aria-invalid', 'true')
  await expect(name).toHaveAccessibleDescription(/obligatorio/i)
  await expect(price).toHaveAccessibleDescription(/mayor que 0/i)
  await expect(name).toBeFocused()
  await expect(page).toHaveURL(/\/dishes\/new$/)

  // 6. Corregir y guardar con el botón «Guardar».
  await page.keyboard.type(dishName)
  await pulsar_y_enfocar(page, 'Tab', price)
  await reemplazar_texto(page, '8.5')
  await expect(name).not.toHaveAttribute('aria-invalid', 'true')
  await expect(price).not.toHaveAttribute('aria-invalid', 'true')
  await mover_foco_hasta(page, 'Tab', cancel)
  await pulsar_y_enfocar(page, 'Tab', save)
  await page.keyboard.press('Enter')

  // 7. El plato aparece en la lista.
  await expect(page).toHaveURL(/\/dishes$/)
  await expect(page.getByRole('cell', { name: new RegExp(dishName) })).toBeVisible()

  // Pausa final para que el resultado se vea en el vídeo.
  await page.waitForTimeout(1500)
})

test.afterEach(async ({ page }, testInfo) => {
  const video = page.video()
  await page.close()
  if (video && testInfo.status === testInfo.expectedStatus) {
    await video.saveAs(VIDEO_PATH)
  }
})
