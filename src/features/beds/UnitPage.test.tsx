import { act, screen, waitFor, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { createMemoryBackend } from '@/data/adapters/memory/createMemoryBackend'
import type { Role } from '@/domain/schemas'
import { es } from '@/i18n/es'
import { seedCensus } from '@/test/censusFixture'
import { writeSession } from '@/features/auth/sessionStorage'
import { renderApp, TEST_UNIT, TEST_USERS } from '@/test/renderApp'

const copy = es.pages.beds
const unit = copy.unit

async function open(path: string, as: Role = 'ADMISSIONS_HEAD') {
  const backend = createMemoryBackend()
  await seedCensus(backend)
  return renderApp(path, backend, { as })
}

describe('UnitPage (bed map)', () => {
  it('shows the unit header, scoped KPIs, legend and one tile per bed grouped by room', async () => {
    await open('/camas/CAR-5N')
    expect(
      await screen.findByRole('heading', { level: 1, name: 'Cardiología 5ª Norte' }),
    ).toBeInTheDocument()
    expect(screen.getByText(/Edificio Norte · planta 5 · Planta/)).toBeInTheDocument()

    // Scoped: the ICU's bed is not counted here (2 occupied of 6 operational).
    const kpis = screen.getByRole('list', { name: copy.kpis.label })
    expect(within(kpis).getByText(copy.kpis.occupancy.label).closest('li')).toHaveTextContent(
      copy.kpis.occupancy.context(2, 6),
    )

    const legend = screen.getByRole('list', { name: unit.legend })
    expect(within(legend).getAllByRole('listitem')).toHaveLength(6)

    const map = screen.getByRole('region', { name: unit.mapTitle })
    expect(within(map).getAllByRole('button')).toHaveLength(7)
    expect(
      within(map)
        .getAllByRole('heading', { level: 3 })
        .map((h) => h.textContent),
    ).toEqual(['A1', 'A2', 'A3', 'A4', 'A5', 'A6', 'A7'].map(unit.room))
    expect(screen.getByRole('link', { name: unit.back })).toHaveAttribute('href', '/camas')
  })

  it('shows initials, stay and discharge on occupied tiles, never the full name on the face', async () => {
    await open('/camas/CAR-5N')
    const map = await screen.findByRole('region', { name: unit.mapTitle })
    const tile = (label: string) =>
      within(map).getByText(label, { selector: 'span' }).closest('button')!

    const a1 = tile('A1')
    expect(a1).toHaveAttribute('data-status', 'OCCUPIED')
    expect(a1).toHaveTextContent('M. G. R.')
    expect(a1).toHaveTextContent(unit.stay('2 d 2 h'))
    expect(a1).toHaveTextContent(unit.discharge.expected('hoy 14:00'))
    expect(a1).not.toHaveTextContent('García')
    expect(a1).not.toHaveTextContent('SIM-P1')

    const a2 = tile('A2')
    expect(a2).toHaveAttribute('data-outlier', 'true')
    expect(a2).toHaveTextContent(unit.outlier)
    // Same severity as the exception it comes from (info), not a critical red.
    expect(within(a2).getByText(unit.outlier)).toHaveClass('text-status-info')
    expect(a2).toHaveTextContent(unit.discharge.ordered)

    expect(tile('A3')).toHaveTextContent(copy.status.AVAILABLE)
    expect(tile('A6')).toHaveTextContent('Avería')
    expect(tile('A6')).toHaveTextContent(`${unit.since} 4 d`)
    expect(tile('A7')).toHaveTextContent('A. S. M.')
    expect(tile('A7')).toHaveTextContent(copy.status.RESERVED)
  })

  it('reveals the full name and NHC only in the detail (keyboard focus)', async () => {
    await open('/camas/CAR-5N')
    const map = await screen.findByRole('region', { name: unit.mapTitle })
    const a1 = within(map).getByText('A1', { selector: 'span' }).closest('button')!
    act(() => a1.focus())
    expect((await screen.findAllByText('María García Ruiz')).length).toBeGreaterThan(0)
    // The specialty is shown by name, not by code.
    expect(screen.getAllByText('Cardiología').length).toBeGreaterThan(0)
    expect(screen.getAllByText('SIM-P1').length).toBeGreaterThan(0)
  })

  it('says so when the unit does not exist', async () => {
    await open('/camas/NOPE')
    expect(await screen.findByText(unit.notFoundDescription('NOPE'))).toBeInTheDocument()
    expect(screen.getByRole('link', { name: unit.back })).toHaveAttribute('href', '/camas')
  })
})

describe('roles and unit scope', () => {
  it.each(['ADMISSIONS_HEAD', 'MANAGEMENT', 'BED_MANAGER', 'ED_COORDINATOR'] as const)(
    '%s reaches the census and any unit',
    async (role) => {
      const { router } = await open('/camas', role)
      await screen.findByRole('list', { name: copy.kpis.label })
      expect(router.state.location.pathname).toBe('/camas')
      await router.navigate('/camas/UCI')
      expect(await screen.findByRole('heading', { level: 1, name: 'UCI' })).toBeInTheDocument()
    },
  )

  it('sends a nurse supervisor from the census straight to their unit', async () => {
    const { router } = await open('/camas', 'NURSE_SUPERVISOR')
    await waitFor(() => expect(router.state.location.pathname).toBe(`/camas/${TEST_UNIT.code}`))
    expect(
      await screen.findByRole('heading', { level: 1, name: TEST_UNIT.name }),
    ).toBeInTheDocument()
    // No way back to a hospital-wide view.
    expect(screen.queryByRole('link', { name: unit.back })).not.toBeInTheDocument()
    expect(TEST_USERS.NURSE_SUPERVISOR.unitId).toBe(TEST_UNIT.id)
  })

  it('keeps a nurse supervisor out of other units, existing or not', async () => {
    const { router } = await open('/camas/UCI', 'NURSE_SUPERVISOR')
    await waitFor(() => expect(router.state.location.pathname).toBe(`/camas/${TEST_UNIT.code}`))
    await router.navigate('/camas/NOPE')
    await waitFor(() => expect(router.state.location.pathname).toBe(`/camas/${TEST_UNIT.code}`))
  })

  it('still keeps the porter out of Camas', async () => {
    const { router } = await open('/camas/UCI', 'PORTER')
    await waitFor(() => expect(router.state.location.pathname).toBe('/traslados'))
  })

  describe.each([
    ['has no unit', undefined],
    ['has a unit that no longer exists', 'ghost-unit'],
  ])('a nurse supervisor who %s', (_name, unitId) => {
    const orphan = {
      ...TEST_USERS.NURSE_SUPERVISOR,
      id: 'usr-orphan',
      username: 'orphan',
      unitId,
    }

    async function openAs(path: string) {
      const backend = createMemoryBackend()
      await seedCensus(backend)
      await backend.events.append([], [{ entity: 'user', op: 'put', record: orphan }])
      writeSession(orphan.id)
      return renderApp(path, backend, { as: null })
    }

    it.each(['/camas', '/camas/UCI', '/camas/CAR-5N'])(
      'sees nothing at %s (fails closed)',
      async (path) => {
        const { router } = await openAs(path)
        expect(await screen.findByText(copy.noUnit.title)).toBeInTheDocument()
        expect(screen.queryByRole('list', { name: copy.kpis.label })).not.toBeInTheDocument()
        expect(screen.queryByRole('region', { name: unit.mapTitle })).not.toBeInTheDocument()
        expect(router.state.location.pathname).toBe(path)
      },
    )
  })
})
