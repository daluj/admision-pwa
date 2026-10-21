import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { describe, expect, it } from 'vitest'
import type { Alert } from '@/domain/schemas'
import { sampleEntities } from '@/domain/schemas/fixtures'
import { es } from '@/i18n/es'
import { OpenAlerts, OVERVIEW_ALERT_LIMIT } from './OpenAlerts'

const make = (n: number): Alert[] =>
  Array.from({ length: n }, (_, i) => ({
    ...sampleEntities.alert,
    id: `a${i}`,
    ruleId: 'BOARDING_LONG',
    params: { initials: `P${i}` },
  }))

describe('OpenAlerts', () => {
  it(`shows at most ${OVERVIEW_ALERT_LIMIT} and says how many more there are`, () => {
    render(
      <MemoryRouter>
        <OpenAlerts alerts={make(13)} />
      </MemoryRouter>,
    )
    expect(screen.getAllByRole('listitem')).toHaveLength(OVERVIEW_ALERT_LIMIT)
    expect(screen.getByText(es.pages.overview.alertsCard.more(3))).toBeInTheDocument()
  })

  it('falls back to the stored message for a rule it does not know', () => {
    render(
      <MemoryRouter>
        <OpenAlerts alerts={[{ ...make(1)[0]!, ruleId: 'MADE_UP', message: 'Something odd' }]} />
      </MemoryRouter>,
    )
    expect(screen.getByText('Something odd')).toBeInTheDocument()
  })
})
