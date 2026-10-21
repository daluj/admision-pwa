import { describe, expect, it, vi } from 'vitest'
import { createMemoryBackend } from '@/data/adapters/memory/createMemoryBackend'
import { ConcurrencyError } from '@/data/ports'
import { createCommandHarness } from '@/test/commandHarness'
import { executeCommand, MAX_COMMAND_ATTEMPTS } from './execute'
import { buildEvent, putChange, type Command } from './types'
import { InvalidCommandError } from './types'
import { sampleEntities } from '@/domain/schemas/fixtures'

const blockBedCommand: Command<{ reason: string }> = async (ctx, { reason }) => {
  const bed = { ...sampleEntities.bed, status: 'BLOCKED' as const, blockedReason: reason }
  return {
    events: [buildEvent(ctx, 'BedBlocked', bed.id, { reason })],
    changes: [putChange(ctx, 'bed', bed)],
  }
}

describe('executeCommand', () => {
  it('appends the events and the state changes together, stamped with the clock', async () => {
    const h = createCommandHarness({ start: '2026-10-21T08:00:00.000Z' })
    const events = await h.run(blockBedCommand, { reason: 'Avería' })

    expect(events).toHaveLength(1)
    expect(events[0]).toMatchObject({
      seq: 1,
      type: 'BedBlocked',
      occurredAt: '2026-10-21T08:00:00.000Z',
      actor: 'simulator',
      entityType: 'Bed',
    })
    const bed = await h.backend.repositories.bed.get(sampleEntities.bed.id)
    expect(bed).toMatchObject({ status: 'BLOCKED', updatedAt: '2026-10-21T08:00:00.000Z' })
  })

  it('writes nothing when the command is rejected', async () => {
    const h = createCommandHarness()
    const rejected: Command<null> = async () => {
      throw new InvalidCommandError('nope')
    }
    await expect(h.run(rejected, null)).rejects.toThrow('nope')
    expect(await h.backend.events.lastSeq()).toBe(0)
    expect(await h.backend.repositories.bed.count()).toBe(0)
  })

  it('rejects a command that produces no events or an invalid event', async () => {
    const h = createCommandHarness()
    const none: Command<null> = async () => ({ events: [], changes: [] })
    await expect(h.run(none, null)).rejects.toThrow(InvalidCommandError)

    const bad: Command<null> = async (ctx) => ({
      events: [buildEvent(ctx, 'BedBlocked', 'bed-1', { reason: '' })],
      changes: [],
    })
    await expect(h.run(bad, null)).rejects.toThrow(/invalid BedBlocked/)
  })

  it('retries from fresh state after a concurrent write', async () => {
    const h = createCommandHarness()
    const realAppend = h.backend.events.append.bind(h.backend.events)
    const append = vi
      .spyOn(h.backend.events, 'append')
      .mockImplementationOnce(async () => {
        throw new ConcurrencyError(0, 1)
      })
      .mockImplementation(realAppend)
    const command = vi.fn(blockBedCommand)

    await executeCommand(h.deps, command, { reason: 'x' })
    expect(command).toHaveBeenCalledTimes(2)
    expect(append).toHaveBeenCalledTimes(2)
    expect(await h.backend.events.lastSeq()).toBe(1)
  })

  it('gives up after the maximum number of attempts', async () => {
    const h = createCommandHarness()
    vi.spyOn(h.backend.events, 'append').mockRejectedValue(new ConcurrencyError(0, 1))
    await expect(executeCommand(h.deps, blockBedCommand, { reason: 'x' })).rejects.toThrow(
      ConcurrencyError,
    )
    expect(h.backend.events.append).toHaveBeenCalledTimes(MAX_COMMAND_ATTEMPTS)
  })

  it('detects a real concurrent writer through expectedLastSeq', async () => {
    const backend = createMemoryBackend()
    const h = createCommandHarness({ backend })
    const racing: Command<null> = async (ctx) => {
      // Another writer appends after this command has read the store.
      await backend.events.append([buildEvent(ctx, 'BedUnblocked', 'bed-x', {})], [])
      return { events: [buildEvent(ctx, 'BedBlocked', 'bed-1', { reason: 'r' })], changes: [] }
    }
    const first = vi.fn(racing)
    // First attempt conflicts; the retry runs the same command again and succeeds after another write.
    await expect(executeCommand(h.deps, first, null)).rejects.toThrow(ConcurrencyError)
    expect(first).toHaveBeenCalledTimes(MAX_COMMAND_ATTEMPTS)
  })
})
