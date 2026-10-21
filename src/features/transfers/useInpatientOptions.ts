import { useMemo } from 'react'
import { useAdmissions, useBeds, usePatients, useUnits } from '@/data/hooks'
import { patientInitials } from '@/domain/kpis/initials'
import type { InpatientOption } from './components/NewTransferSheet'

/** Admitted patients in a bed, ordered by unit and bed, for the "Nuevo traslado" sheet. */
export function useInpatientOptions(): InpatientOption[] {
  const admissions = useAdmissions()
  const beds = useBeds()
  const units = useUnits()
  const patients = usePatients()
  return useMemo(() => {
    if (!admissions || !beds || !units || !patients) return []
    const bedById = new Map(beds.map((b) => [b.id, b]))
    const unitById = new Map(units.map((u) => [u.id, u]))
    const patientById = new Map(patients.map((p) => [p.id, p]))
    const options: InpatientOption[] = []
    for (const a of admissions) {
      if (a.status !== 'ADMITTED' || !a.bedId) continue
      const bed = bedById.get(a.bedId)
      const patient = patientById.get(a.patientId)
      const unit = bed && unitById.get(bed.unitId)
      if (!bed || !patient || !unit) continue
      const where = `${unit.name} ${bed.label}`.trim()
      options.push({
        patientId: patient.id,
        bedId: bed.id,
        label: `${where} · ${patientInitials(patient)}`,
        fromLabel: where,
      })
    }
    return options.sort((a, b) => a.fromLabel.localeCompare(b.fromLabel, 'es', { numeric: true }))
  }, [admissions, beds, units, patients])
}
