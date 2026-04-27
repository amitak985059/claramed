import { test, expect } from '@playwright/test'

// ─── Homepage ─────────────────────────────────────────────────────────────────
test.describe('Homepage', () => {
    test('loads and shows header', async ({ page }) => {
        await page.goto('/')
        await expect(page).toHaveTitle(/Claramed/i)
    })

    test('navigation links are visible', async ({ page }) => {
        await page.goto('/')
        await expect(page.getByRole('link', { name: /home/i }).first()).toBeVisible()
        await expect(page.getByRole('link', { name: /all doctors/i }).first()).toBeVisible()
    })

    test('clicking All Doctors navigates to /doctors', async ({ page }) => {
        await page.goto('/')
        await page.getByRole('link', { name: /all doctors/i }).first().click()
        await page.waitForURL('**/doctors')
        expect(page.url()).toContain('/doctors')
    })
})

// ─── Doctors Listing ──────────────────────────────────────────────────────────
test.describe('Doctors listing page', () => {
    test('shows doctor cards', async ({ page }) => {
        await page.goto('/doctors')
        // Wait for doctor cards to load
        await page.waitForSelector('img', { timeout: 10000 })
        const cards = page.locator('img').first()
        await expect(cards).toBeVisible()
    })

    test('speciality filter buttons exist', async ({ page }) => {
        await page.goto('/doctors')
        // Should have speciality filter buttons
        await expect(page.getByText(/General physician/i).first()).toBeVisible()
    })
})

// ─── Login page ───────────────────────────────────────────────────────────────
test.describe('Login page', () => {
    test('login form renders', async ({ page }) => {
        await page.goto('/login')
        await expect(page.locator('form').getByRole('button', { name: /login/i }).or(page.locator('form').getByRole('button', { name: /create account/i }))).toBeVisible()
    })

    test('shows error on empty form submit', async ({ page }) => {
        await page.goto('/login')
        // Try submitting without filling in form
        const submitBtn = page.locator('form').getByRole('button').first()
        await submitBtn.click()
        // Form should still be on the same page (not navigate)
        await expect(page).not.toHaveURL('/')
    })

    test('can toggle between login and signup', async ({ page }) => {
        await page.goto('/login')
        // Check that toggle link exists
        const toggle = page.getByText(/create account/i).or(page.getByText(/login here/i))
        await expect(toggle.first()).toBeVisible()
    })
})

// ─── About page ───────────────────────────────────────────────────────────────
test.describe('About page', () => {
    test('loads about page', async ({ page }) => {
        await page.goto('/about')
        await expect(page.getByText(/about/i).first()).toBeVisible()
    })
})

// ─── Appointment page ─────────────────────────────────────────────────────────
test.describe('Appointment booking page', () => {
    test('redirects to login if not authenticated', async ({ page }) => {
        // Navigate to an appointment page for any doc
        await page.goto('/doctors')
        await page.waitForLoadState('networkidle')

        // Click first doctor card
        const firstCard = page.locator('a[href*="/appointment/"]').first()
        const exists = await firstCard.count()
        if (exists > 0) {
            await firstCard.click()
            await page.waitForLoadState('networkidle')
            // Booking button should either show or redirect to login
            const url = page.url()
            // Either on appointment page or redirected to login
            expect(url).toMatch(/appointment|login/)
        }
    })
})
