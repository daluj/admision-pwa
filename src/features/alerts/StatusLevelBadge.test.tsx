import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { es } from '@/i18n/es'
import { StatusLevel } from './StatusLevelBadge'

const copy = es.topBar.statusLevel

describe('StatusLevel', () => {
  it.each([
    ['NORMAL', copy.normal],
    ['ALERT', copy.alert],
    ['CRITICAL', copy.critical],
  ] as const)('%s shows its text (never colour alone) and an accessible label', (level, text) => {
    render(<StatusLevel level={level} />)
    const badge = screen.getByText(text, { exact: false }).closest('[data-level]')!
    expect(badge).toHaveAttribute('data-level', level)
    expect(badge).toHaveTextContent(`${copy.label}: ${text}`)
    expect(badge.querySelector('svg')).not.toBeNull()
  })
})
