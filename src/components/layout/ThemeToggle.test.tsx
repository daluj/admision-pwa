import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { THEME_STORAGE_KEY } from '@/components/theme/theme'
import { ThemeProvider } from '@/components/theme/ThemeProvider'
import { es } from '@/i18n/es'
import { ThemeToggle } from './ThemeToggle'

function renderToggle() {
  return render(
    <ThemeProvider>
      <ThemeToggle />
    </ThemeProvider>,
  )
}

async function choose(user: ReturnType<typeof userEvent.setup>, label: string) {
  await user.click(screen.getByRole('button', { name: es.theme.toggle }))
  await user.click(await screen.findByRole('menuitemradio', { name: label }))
}

describe('ThemeToggle', () => {
  it('adds and removes the dark class on <html>', async () => {
    const user = userEvent.setup()
    renderToggle()
    expect(document.documentElement).not.toHaveClass('dark')

    await choose(user, es.theme.dark)
    expect(document.documentElement).toHaveClass('dark')

    await choose(user, es.theme.light)
    expect(document.documentElement).not.toHaveClass('dark')
  })

  it('persists the choice across a reload', async () => {
    const user = userEvent.setup()
    const { unmount } = renderToggle()

    await choose(user, es.theme.dark)
    expect(window.localStorage.getItem(THEME_STORAGE_KEY)).toBe('dark')

    unmount()
    document.documentElement.classList.remove('dark')
    renderToggle()
    expect(document.documentElement).toHaveClass('dark')
  })

  it('still works when localStorage throws', async () => {
    const user = userEvent.setup()
    const original = Storage.prototype.setItem
    Storage.prototype.setItem = () => {
      throw new Error('blocked')
    }
    try {
      renderToggle()
      await choose(user, es.theme.dark)
      expect(document.documentElement).toHaveClass('dark')
    } finally {
      Storage.prototype.setItem = original
    }
  })
})
