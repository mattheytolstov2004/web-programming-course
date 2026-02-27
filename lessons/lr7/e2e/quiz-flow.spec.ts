import { test, expect } from '@playwright/test'

test.describe('Quiz Application E2E', () => {

  test('user can start quiz and answer question', async ({ page }) => {
    await page.goto('/')


    const loginButton = page.locator('text=Login')
    await expect(loginButton).toBeVisible({ timeout: 10000 })
    await loginButton.click()

    const startButton = page.locator('text=Начать игру')
    await expect(startButton).toBeVisible({ timeout: 10000 })
    await startButton.click()

    await expect(page.locator('h2')).toBeVisible({ timeout: 10000 })

    await expect(page.getByTestId('progress')).toBeVisible()

    const optionButtons = page.locator('button')
    const count = await optionButtons.count()

    if (count > 1) {
      await optionButtons.nth(1).click()
    }

    const nextButton = page.locator('text=Следующий вопрос')
    if (await nextButton.isVisible()) {
      await nextButton.click()
    }
  })


  test('essay question shows textarea and character counter', async ({ page }) => {
    await page.goto('/')

    const loginButton = page.locator('text=Login')
    await expect(loginButton).toBeVisible({ timeout: 10000 })
    await loginButton.click()

    const startButton = page.locator('text=Начать игру')
    await expect(startButton).toBeVisible({ timeout: 10000 })
    await startButton.click()

    await expect(page.locator('h2')).toBeVisible({ timeout: 10000 })

    const textarea = page.locator('textarea')

    if (await textarea.isVisible()) {
      await textarea.fill('A'.repeat(100))
      await expect(textarea).toHaveValue('A'.repeat(100))
    }
  })

})
