import type { Patient } from '@/domain/schemas'

const PARTICLES = new Set(['de', 'del', 'la', 'las', 'los', 'y'])

/** "María" "García Ruiz" → "M. G. R." — enough to recognise a patient on a board, not to identify them. */
export function patientInitials(patient: Pick<Patient, 'firstName' | 'lastName'>): string {
  const words = [
    patient.firstName.trim().split(/\s+/)[0] ?? '',
    ...patient.lastName.trim().split(/\s+/),
  ].filter((word) => word !== '' && !PARTICLES.has(word.toLowerCase()))
  return words.map((word) => `${word.charAt(0).toLocaleUpperCase('es-ES')}.`).join(' ')
}
