import { act, render, screen, waitFor, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { createMemoryBackend } from '@/data/adapters/memory/createMemoryBackend'
import { DataProvider } from '@/data/DataProvider'
import { sampleEntities } from '@/domain/schemas/fixtures'
import { ENTITY_NAMES, type EntityName } from '@/domain/schemas'
import { es } from '@/i18n/es'
import { DatabaseStatusCard } from './DatabaseStatusCard'
import { DatabaseStatusSection } from './DatabaseStatusSection'

const copy = es.pages.settings.database

const zeroCounts = {
  ...(Object.fromEntries(ENTITY_NAMES.map((name) => [name, 0])) as Record<EntityName, number>),
  events: 0,
}

function valueOf(label: string) {
  const term = screen.getByText(label, { selector: 'dt' })
  return term.nextElementSibling?.textContent
}

describe('DatabaseStatusCard', () => {
  it('renders backend, schema version, every table and the empty hint', () => {
    render(<DatabaseStatusCard info={{ name: 'dexie', schemaVersion: 1 }} counts={zeroCounts} />)
    expect(valueOf(copy.backend)).toBe('IndexedDB')
    expect(valueOf(copy.schemaVersion)).toBe('1')
    expect(valueOf(copy.events)).toBe('0')
    for (const name of ENTITY_NAMES) expect(valueOf(copy.tables[name])).toBe('0')
    expect(screen.getByText(copy.emptyHint)).toBeInTheDocument()
  })

  it('shows the memory backend label and formatted counts', () => {
    render(
      <DatabaseStatusCard
        info={{ name: 'memory', schemaVersion: 1 }}
        counts={{ ...zeroCounts, bed: 12345, events: 5 }}
      />,
    )
    expect(valueOf(copy.backend)).toBe('Memoria (pruebas)')
    // es-ES groups thousands with a dot (from 5 digits on).
    expect(valueOf(copy.tables.bed)).toBe('12.345')
    expect(screen.queryByText(copy.emptyHint)).not.toBeInTheDocument()
  })

  it('shows placeholders while loading', () => {
    render(<DatabaseStatusCard info={{ name: 'dexie', schemaVersion: 1 }} counts={undefined} />)
    expect(screen.getByText(copy.loading)).toBeInTheDocument()
    expect(valueOf(copy.events)).toBe('')
  })
})

describe('DatabaseStatusSection', () => {
  it('shows live counts from the backend and updates after an append', async () => {
    const backend = createMemoryBackend({ validateSchemas: true })
    render(
      <DataProvider backend={backend}>
        <DatabaseStatusSection />
      </DataProvider>,
    )
    expect(await screen.findByText(copy.emptyHint)).toBeInTheDocument()

    await act(() =>
      backend.events.append(
        [
          {
            id: 'evt-1',
            type: 'BedUnblocked',
            occurredAt: '2026-10-20T08:00:00.000Z',
            actor: 'simulator',
            entityType: 'Bed',
            entityId: sampleEntities.bed.id,
            payload: {},
          },
        ],
        [{ entity: 'bed', op: 'put', record: sampleEntities.bed }],
      ),
    )
    await waitFor(() => expect(valueOf(copy.events)).toBe('1'))
    expect(valueOf(copy.tables.bed)).toBe('1')
    expect(screen.queryByText(copy.emptyHint)).not.toBeInTheDocument()
    const tables = screen.getByRole('heading', { name: copy.tablesTitle }).closest('section')!
    expect(within(tables).getAllByRole('definition')).toHaveLength(12)
  })
})
