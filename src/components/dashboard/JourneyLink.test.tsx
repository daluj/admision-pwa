import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { describe, expect, it } from 'vitest'
import { SessionContext, type SessionState } from '@/features/auth/sessionContext'
import { sampleEntities } from '@/domain/schemas/fixtures'
import { es } from '@/i18n/es'
import { JourneyLink } from './JourneyLink'

const session = (can: boolean): SessionState => ({
  status: 'authenticated',
  user: sampleEntities.user,
  can: () => can,
  logout: () => undefined,
})

const renderLink = (value: SessionState | null, withRouter = true) => {
  const link = (
    <SessionContext.Provider value={value}>
      <JourneyLink patientId="p-1" initials="M. G. R." />
    </SessionContext.Provider>
  )
  return render(withRouter ? <MemoryRouter>{link}</MemoryRouter> : link)
}

describe('JourneyLink', () => {
  it('links to the journey by patient id only, with the initials as its name', () => {
    renderLink(session(true))
    const link = screen.getByRole('link', { name: es.pages.tracking.link('M. G. R.') })
    expect(link).toHaveAttribute('href', '/seguimiento/p-1')
  })

  it('is absent for roles that cannot open Seguimiento', () => {
    renderLink(session(false))
    expect(screen.queryByRole('link')).not.toBeInTheDocument()
  })

  it('is absent without a session or outside a router', () => {
    renderLink(null)
    expect(screen.queryByRole('link')).not.toBeInTheDocument()
    renderLink(session(true), false)
    expect(screen.queryByRole('link')).not.toBeInTheDocument()
  })
})
