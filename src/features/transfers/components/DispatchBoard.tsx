import { useRef, useState } from 'react'
import type { QueueRow, Transfers } from '@/domain/kpis'
import { useInpatientOptions } from '../useInpatientOptions'
import { useTransferActions } from '../useTransferActions'
import { AssignSheet } from './AssignSheet'
import { CancelSheet } from './CancelSheet'
import { NewTransferSheet } from './NewTransferSheet'
import { PortersPanel } from './PortersPanel'
import { TransferExceptions } from './TransferExceptions'
import { TransferKpis } from './TransferKpis'
import { TransferQueue } from './TransferQueue'

type Editing = { kind: 'assign' | 'cancel'; row: QueueRow } | { kind: 'new' }

/** The dispatch board: KPIs, exceptions, queue, porters, and the three action sheets. */
export function DispatchBoard({ data }: { data: Transfers }) {
  const actions = useTransferActions()
  const inpatients = useInpatientOptions()
  const [editing, setEditing] = useState<Editing | null>(null)
  const returnFocusTo = useRef<HTMLElement | null>(null)

  const open = (next: Editing) => {
    returnFocusTo.current = document.activeElement as HTMLElement | null
    setEditing(next)
  }
  const focusBack = (event: Event) => {
    event.preventDefault()
    returnFocusTo.current?.focus()
  }
  const close = () => setEditing(null)

  // Follow the transfer live: if someone else assigned, cancelled or picked it up, say so.
  const target = editing && editing.kind !== 'new' ? editing : null
  const live = target ? data.queue.find((r) => r.transfer.id === target.row.transfer.id) : undefined
  const row = live ?? target?.row ?? null
  const label = row ? `${row.initials} → ${row.toLabel}` : ''
  const assignGone = !live || live.status !== 'REQUESTED'
  const cancelGone = !live || live.status === 'PICKED_UP'
  const freePorters = data.porters
    .filter((p) => p.porter.status === 'AVAILABLE')
    .sort((a, b) => (a.lastDeliveredAt ?? '').localeCompare(b.lastDeliveredAt ?? ''))

  return (
    <>
      <TransferKpis kpis={data.kpis} />
      <TransferExceptions exceptions={data.exceptions} />
      <TransferQueue
        rows={data.queue}
        canCreate={actions.canAct('create')}
        canAssign={actions.canAct('assign')}
        canCancel={actions.canAct('cancel')}
        onNew={() => open({ kind: 'new' })}
        onAssign={(r) => open({ kind: 'assign', row: r })}
        onCancel={(r) => open({ kind: 'cancel', row: r })}
      />
      <PortersPanel rows={data.porters} offShift={data.kpis.portersOff} />
      <AssignSheet
        row={target?.kind === 'assign' ? row : null}
        porters={freePorters}
        unavailable={assignGone}
        busy={actions.busy}
        onConfirm={(porterId) =>
          actions.perform({ action: 'assign', transferId: row!.transfer.id, porterId, label })
        }
        onClose={close}
        onCloseAutoFocus={focusBack}
      />
      <CancelSheet
        row={target?.kind === 'cancel' ? row : null}
        unavailable={cancelGone}
        busy={actions.busy}
        onConfirm={(reason) =>
          actions.perform({
            action: 'cancel',
            transferId: row!.transfer.id,
            label,
            ...(reason ? { reason } : {}),
          })
        }
        onClose={close}
        onCloseAutoFocus={focusBack}
      />
      <NewTransferSheet
        open={editing?.kind === 'new'}
        options={inpatients}
        busy={actions.busy}
        onConfirm={(input, text) => actions.perform({ action: 'create', input, label: text })}
        onClose={close}
        onCloseAutoFocus={focusBack}
      />
    </>
  )
}
