import { useMemo, useRef, useState } from 'react'
import { useBedRequests, useEdVisits, useSpecialties } from '@/data/hooks'
import {
  openBedRequests,
  suggestBeds,
  type BedSuggestions,
  type OpenRequestRow,
} from '@/domain/kpis'
import { applyRequestFilters, type BedFilters } from '../bedFilters'
import { useBedActions } from '../useBedActions'
import { useCensusSource } from '../useCensus'
import { AssignBedSheet } from './AssignBedSheet'
import { BedRequestList } from './BedRequestList'

const NO_SUGGESTIONS: BedSuggestions = { suggestions: [], candidates: [] }

/** Container: live open requests, the assignment sheet and the reserve action. */
export function BedRequestSection({ filters }: { filters: BedFilters }) {
  const source = useCensusSource()
  const requests = useBedRequests()
  const edVisits = useEdVisits()
  const specialties = useSpecialties()
  const actions = useBedActions()
  // What was clicked (kept so the sheet can explain itself if the request disappears).
  const [assigningRow, setAssigningRow] = useState<OpenRequestRow | null>(null)
  const returnFocusTo = useRef<HTMLElement | null>(null)

  const open = useMemo(
    () =>
      source && requests && edVisits && specialties
        ? openBedRequests({
            requests,
            admissions: source.admissions,
            patients: source.patients,
            edVisits,
            specialties,
            now: source.now,
          })
        : undefined,
    [source, requests, edVisits, specialties],
  )
  const rows = useMemo(() => (open ? applyRequestFilters(open.open, filters) : []), [open, filters])

  // The row follows live data. If the request vanishes while the sheet is open (assigned by the
  // simulator or someone else) the sheet stays, with an explanation, instead of closing silently.
  const live = assigningRow
    ? (open?.open.find((row) => row.request.id === assigningRow.request.id) ?? null)
    : null
  const gone = assigningRow !== null && open !== undefined && live === null
  const assigning = live
  const suggestions = useMemo(
    () =>
      assigning && source
        ? suggestBeds({ request: assigning.request, beds: source.beds, units: source.units })
        : NO_SUGGESTIONS,
    [assigning, source],
  )

  if (!open || !source) return null

  return (
    <>
      <BedRequestList
        rows={rows}
        assignedCount={open.assignedCount}
        now={source.now}
        canAssign={actions.canAct('reserve', '')}
        onAssign={(row) => {
          returnFocusTo.current = document.activeElement as HTMLElement | null
          setAssigningRow(row)
        }}
      />
      <AssignBedSheet
        row={live ?? assigningRow}
        unavailable={gone}
        suggestions={suggestions}
        busy={actions.busy}
        onClose={() => setAssigningRow(null)}
        onCloseAutoFocus={(event) => {
          event.preventDefault()
          returnFocusTo.current?.focus()
        }}
        onReserve={(candidate) =>
          actions.perform({
            action: 'reserve',
            bedRequestId: assigning!.request.id,
            bedId: candidate.bed.id,
            bedLabel: candidate.bed.label,
            ...(assigning!.initials ? { initials: assigning!.initials } : {}),
          })
        }
      />
    </>
  )
}
