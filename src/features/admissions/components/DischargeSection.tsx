import { useRef, useState } from 'react'
import type { Admissions, WorklistRow } from '@/domain/kpis'
import { useDischargeActions } from '../useDischargeActions'
import { DischargeWorklist } from './DischargeWorklist'
import { ExpectedSheet } from './ExpectedSheet'
import { OrderSheet } from './OrderSheet'

type Editing = { kind: 'expected' | 'order'; row: WorklistRow }

/** Container: the worklist, its two sheets and the discharge actions. */
export function DischargeSection({ data, now }: { data: Admissions; now: string }) {
  const actions = useDischargeActions()
  const [editing, setEditing] = useState<Editing | null>(null)
  const returnFocusTo = useRef<HTMLElement | null>(null)

  const open = (kind: Editing['kind']) => (row: WorklistRow) => {
    returnFocusTo.current = document.activeElement as HTMLElement | null
    setEditing({ kind, row })
  }

  // Follow the patient live: if they were discharged-ordered or left meanwhile, say so.
  const live = editing
    ? data.worklist.find((r) => r.admission.id === editing.row.admission.id)
    : undefined
  const unavailable = editing !== null && (!live || live.ordered)
  const row = live ?? editing?.row ?? null
  const label = row ? `${row.bed.label} · ${row.initials}` : ''
  const focusBack = (event: Event) => {
    event.preventDefault()
    returnFocusTo.current?.focus()
  }

  return (
    <>
      <DischargeWorklist
        rows={data.worklist}
        now={now}
        canAct={(r) => actions.canAct('setExpected', r.unit.id)}
        onEdit={open('expected')}
        onOrder={open('order')}
      />
      <ExpectedSheet
        row={editing?.kind === 'expected' ? row : null}
        now={now}
        unavailable={unavailable}
        busy={actions.busy}
        onSave={(expectedDischargeAt) =>
          actions.perform({
            action: 'setExpected',
            admissionId: row!.admission.id,
            expectedDischargeAt,
            label,
          })
        }
        onClose={() => setEditing(null)}
        onCloseAutoFocus={focusBack}
      />
      <OrderSheet
        row={editing?.kind === 'order' ? row : null}
        unavailable={unavailable}
        busy={actions.busy}
        onConfirm={() =>
          actions.perform({ action: 'order', admissionId: row!.admission.id, label })
        }
        onClose={() => setEditing(null)}
        onCloseAutoFocus={focusBack}
      />
    </>
  )
}
