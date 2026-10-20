import { screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { es } from '@/i18n/es'
import { renderApp } from '@/test/renderApp'

describe('AppShell', () => {
  it('renders the overview page inside the shell', async () => {
    renderApp('/')
    expect(
      await screen.findByRole('heading', { level: 1, name: es.pages.overview.title }),
    ).toBeInTheDocument()
  })
})
