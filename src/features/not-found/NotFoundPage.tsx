import { MapPinOff } from 'lucide-react'
import { Link } from 'react-router'
import { EmptyState } from '@/components/common/EmptyState'
import { PageHeader } from '@/components/common/PageHeader'
import { Button } from '@/components/ui/button'
import { es } from '@/i18n/es'

const copy = es.pages.notFound

export default function NotFoundPage() {
  return (
    <>
      <PageHeader title={copy.title} />
      <EmptyState icon={MapPinOff} title={copy.code} description={copy.description}>
        <Button asChild>
          <Link to="/">{copy.backHome}</Link>
        </Button>
      </EmptyState>
    </>
  )
}
