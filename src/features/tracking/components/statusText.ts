import type { JourneyEpisode, JourneyLocation } from '@/domain/kpis'
import { es } from '@/i18n/es'

const copy = es.pages.tracking

export const statusText = (episode: Pick<JourneyEpisode, 'status'>): string =>
  copy.status[episode.status]

export function locationText(location: JourneyLocation): string {
  switch (location.kind) {
    case 'ED':
      return copy.journey.location.ED(es.pages.emergency.board.areas[location.area])
    case 'BED':
      return copy.journey.location.BED(location.label)
    case 'TRANSFER':
      return copy.journey.location.TRANSFER(location.label)
    case 'NONE':
      return copy.journey.location.NONE
  }
}
