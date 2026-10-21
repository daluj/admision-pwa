import { screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { createMemoryBackend } from '@/data/adapters/memory/createMemoryBackend'
import { NAV_ITEMS } from '@/components/layout/nav'
import { ROLE_AREAS } from '@/domain/access'
import { ROLES } from '@/domain/schemas'
import { es } from '@/i18n/es'
import { renderApp } from '@/test/renderApp'

afterEach(() => vi.restoreAllMocks())

/**
 * Empty/loading audit: every page, for every role that may open it, renders against an empty
 * database (the demo is not seeded) with its heading and no crash — i.e. each has a loading or
 * an empty state instead of failing on missing data.
 */
const CASES = ROLES.flatMap((role) =>
  NAV_ITEMS.filter((item) => ROLE_AREAS[role].includes(item.id)).map(
    (item) => [role, item] as const,
  ),
)

describe('pages on an empty database', () => {
  it.each(CASES)('%s opens %s without crashing', async (role, item) => {
    const errors = vi.spyOn(console, 'error').mockImplementation(() => {})
    renderApp(item.path, createMemoryBackend(), { as: role })
    await screen.findByRole('heading', { level: 1 })
    // Give the live queries a moment to answer with empty tables before judging.
    await new Promise((resolve) => setTimeout(resolve, 50))
    expect(screen.queryByText(es.crash.title)).not.toBeInTheDocument()
    expect(errors).not.toHaveBeenCalledWith('[route crash]', expect.anything())
  })
})
