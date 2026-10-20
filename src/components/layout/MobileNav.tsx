import { Menu, RadioTower } from 'lucide-react'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet'
import { es } from '@/i18n/es'
import { NavList } from './NavList'

/** Phone navigation: the sidebar as a sheet, opened from the top bar. */
export function MobileNav() {
  const [open, setOpen] = useState(false)

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="md:hidden" aria-label={es.nav.openMenu}>
          <Menu aria-hidden="true" />
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="bg-sidebar text-sidebar-foreground w-72 p-0">
        <SheetHeader className="flex-row items-center gap-2 px-4 py-4">
          <RadioTower className="text-primary size-6" aria-hidden="true" />
          <SheetTitle>{es.app.name}</SheetTitle>
          <SheetDescription className="sr-only">{es.nav.label}</SheetDescription>
        </SheetHeader>
        <nav aria-label={es.nav.label} className="px-2">
          <NavList showLabels onNavigate={() => setOpen(false)} />
        </nav>
      </SheetContent>
    </Sheet>
  )
}
