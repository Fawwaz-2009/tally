import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { expect, test } from '@playwright/test'
import { resetTestDatabase } from '@/test-utils/db-utils'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// Reset database before each test
test.beforeEach(async () => {
  await resetTestDatabase()
})

test.describe('Add Expense Flow', () => {
  test('shows add expense form with all required fields', async ({ page }) => {
    await page.goto('/add')

    // Wait for page to load
    await expect(page.getByRole('heading', { name: 'Add Expense' })).toBeVisible()

    // Check that all form fields are present
    await expect(page.getByText('Receipt Image')).toBeVisible()
    await expect(page.getByText('Upload Receipt')).toBeVisible()
    await expect(page.getByLabel('Merchant')).toBeVisible()
    await expect(page.getByLabel('Amount')).toBeVisible()
    await expect(page.getByText('Currency')).toBeVisible()
    await expect(page.getByText('Transaction Date')).toBeVisible()
    await expect(page.getByRole('button', { name: /save expense/i })).toBeVisible()
  })

  test('shows validation error when submitting without image', async ({ page }) => {
    await page.goto('/add')

    // Fill in other fields
    await page.getByLabel('Merchant').fill('Test Store')
    await page.getByLabel('Amount').fill('25.99')

    // Submit without image
    await page.getByRole('button', { name: /save expense/i }).click()

    // Should show error
    await expect(page.getByText('Please select a receipt image')).toBeVisible()
  })

  test('shows validation error when submitting without amount', async ({ page }) => {
    await page.goto('/add')

    // Upload a test image
    const testImagePath = path.join(__dirname, 'test-receipt.png')
    await page.locator('input[type="file"]').setInputFiles(testImagePath)

    // Fill in other fields but not amount
    await page.getByLabel('Merchant').fill('Test Store')

    // Submit without amount
    await page.getByRole('button', { name: /save expense/i }).click()

    // Should show error
    await expect(page.getByText('Please enter a valid amount')).toBeVisible()
  })

  test('shows validation error when submitting without merchant', async ({ page }) => {
    await page.goto('/add')

    // Upload a test image
    const testImagePath = path.join(__dirname, 'test-receipt.png')
    await page.locator('input[type="file"]').setInputFiles(testImagePath)

    // Fill in amount but not merchant
    await page.getByLabel('Amount').fill('25.99')

    // Submit without merchant
    await page.getByRole('button', { name: /save expense/i }).click()

    // Should show error
    await expect(page.getByText('Please enter a merchant name')).toBeVisible()
  })

  test('successfully creates expense and shows success screen', async ({ page }) => {
    await page.goto('/add')

    // Wait for page to be fully loaded
    await expect(page.getByRole('heading', { name: 'Add Expense' })).toBeVisible()

    // Upload a test image
    const testImagePath = path.join(__dirname, 'test-receipt.png')
    await page.locator('input[type="file"]').setInputFiles(testImagePath)

    // Wait for preview to appear
    await expect(page.locator('img[alt="Receipt preview"]')).toBeVisible()

    // Fill in all required fields
    await page.getByLabel('Merchant').fill('Coffee Shop')
    await page.getByLabel('Amount').fill('5.50')

    // Submit the form
    await page.getByRole('button', { name: /save expense/i }).click()

    // Wait for either success or error
    await expect(
      page.getByRole('heading', { name: 'Expense Added!' }).or(page.locator('.text-destructive'))
    ).toBeVisible({ timeout: 15000 })

    // Check that success is shown (not error)
    const errorElement = page.locator('.bg-destructive\\/10')
    if (await errorElement.isVisible()) {
      const errorText = await errorElement.textContent()
      throw new Error(`Expense creation failed with error: ${errorText}`)
    }

    await expect(page.getByRole('heading', { name: 'Expense Added!' })).toBeVisible()
    await expect(page.getByText('Your expense has been saved successfully')).toBeVisible()

    // Should see action buttons
    await expect(page.getByRole('button', { name: /add another expense/i })).toBeVisible()
    await expect(page.getByRole('button', { name: /go to dashboard/i })).toBeVisible()
  })

  test('can add another expense after success', async ({ page }) => {
    await page.goto('/add')

    // Create first expense
    const testImagePath = path.join(__dirname, 'test-receipt.png')
    await page.locator('input[type="file"]').setInputFiles(testImagePath)
    await page.getByLabel('Merchant').fill('Coffee Shop')
    await page.getByLabel('Amount').fill('5.50')
    await page.getByRole('button', { name: /save expense/i }).click()

    // Wait for success
    await expect(page.getByRole('heading', { name: 'Expense Added!' })).toBeVisible({ timeout: 10000 })

    // Click add another
    await page.getByRole('button', { name: /add another expense/i }).click()

    // Should be back to form
    await expect(page.getByRole('heading', { name: 'Add Expense' })).toBeVisible()
    await expect(page.getByLabel('Merchant')).toHaveValue('')
    await expect(page.getByLabel('Amount')).toHaveValue('')
  })

  test('can navigate to dashboard after success', async ({ page }) => {
    await page.goto('/add')

    // Create expense
    const testImagePath = path.join(__dirname, 'test-receipt.png')
    await page.locator('input[type="file"]').setInputFiles(testImagePath)
    await page.getByLabel('Merchant').fill('Coffee Shop')
    await page.getByLabel('Amount').fill('5.50')
    await page.getByRole('button', { name: /save expense/i }).click()

    // Wait for success
    await expect(page.getByRole('heading', { name: 'Expense Added!' })).toBeVisible({ timeout: 10000 })

    // Click go to dashboard
    await page.getByRole('button', { name: /go to dashboard/i }).click()

    // Should navigate to dashboard and show the expense
    await expect(page).toHaveURL(/^\/$|^\/?.*dateRange.*$/)
    await expect(page.getByText('Coffee Shop')).toBeVisible()
  })

  test('allows removing uploaded image', async ({ page }) => {
    await page.goto('/add')

    // Upload a test image
    const testImagePath = path.join(__dirname, 'test-receipt.png')
    await page.locator('input[type="file"]').setInputFiles(testImagePath)

    // Image preview should be visible
    await expect(page.locator('img[alt="Receipt preview"]')).toBeVisible()

    // Click remove button
    await page.getByRole('button', { name: '' }).filter({ has: page.locator('svg') }).first().click()

    // Should show upload prompt again
    await expect(page.getByText('Upload Receipt')).toBeVisible()
  })
})
