import { useId, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import type { Role, Unit, User } from '@/domain/schemas'
import { es } from '@/i18n/es'

type RoleCardProps = {
  role: Role
  /** Users with this role. Nurse supervisors are chosen through their unit. */
  users: User[]
  units: Unit[]
  onEnter: (user: User) => void
}

export function RoleCard({ role, users, units, onEnter }: RoleCardProps) {
  const selectId = useId()
  const roleLabel = es.roles[role]
  const byUnit = role === 'NURSE_SUPERVISOR'
  const unitName = (user: User) => units.find((unit) => unit.id === user.unitId)?.name ?? ''
  const options = byUnit
    ? [...users].sort((a, b) => unitName(a).localeCompare(unitName(b), 'es'))
    : []
  const [selected, setSelected] = useState<string>('')
  const chosen = byUnit ? options.find((user) => user.id === selected) : users[0]

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">
          <h2>{roleLabel}</h2>
        </CardTitle>
        <CardDescription>{es.login.roleDescriptions[role]}</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-1 flex-col justify-end gap-3">
        {byUnit ? (
          <div className="flex flex-col gap-1.5">
            <Label htmlFor={selectId}>{es.login.unitLabel}</Label>
            <select
              id={selectId}
              value={selected}
              onChange={(event) => setSelected(event.target.value)}
              className="border-input bg-background h-9 rounded-md border px-2 text-sm"
            >
              <option value="">—</option>
              {options.map((user) => (
                <option key={user.id} value={user.id}>
                  {unitName(user)}
                </option>
              ))}
            </select>
          </div>
        ) : (
          chosen && <p className="text-muted-foreground text-sm">{chosen.displayName}</p>
        )}
        {byUnit && chosen && <p className="text-muted-foreground text-sm">{chosen.displayName}</p>}
        <Button
          disabled={!chosen}
          onClick={() => chosen && onEnter(chosen)}
          aria-label={es.login.enterAs(roleLabel)}
        >
          {es.login.enter}
        </Button>
      </CardContent>
    </Card>
  )
}
