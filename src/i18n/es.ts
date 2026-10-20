/**
 * All user-facing Spanish (es-ES) copy. Components read strings from here only.
 */
export const es = {
  app: {
    name: 'Torre de Control',
    fullName: 'Torre de Control — Admisión',
    shortName: 'Torre Control',
    description: 'Cuadros de mando en tiempo real del Servicio de Admisión (datos ficticios).',
    skipToContent: 'Saltar al contenido principal',
    documentTitle: (page: string) => `${page} · Torre de Control`,
  },
  nav: {
    label: 'Navegación principal',
    collapse: 'Contraer menú',
    expand: 'Expandir menú',
    openMenu: 'Abrir menú',
    items: {
      overview: 'Torre de control',
      beds: 'Camas',
      emergency: 'Urgencias',
      admissions: 'Ingresos y altas',
      transfers: 'Traslados',
      tracking: 'Seguimiento',
      settings: 'Ajustes',
    },
  },
  topBar: {
    statusLevel: {
      label: 'Nivel del hospital',
      normal: 'Normal',
    },
    clock: {
      label: 'Hora simulada',
    },
    alerts: {
      label: 'Alertas',
      count: (n: number) => (n === 1 ? '1 alerta activa' : `${n} alertas activas`),
      empty: 'No hay alertas activas',
    },
    user: {
      label: 'Usuario',
      guest: 'Invitado',
      role: 'Acceso de demostración',
    },
  },
  banner: {
    demo: 'Entorno de demostración — datos ficticios',
  },
  theme: {
    toggle: 'Cambiar tema',
    light: 'Claro',
    dark: 'Oscuro',
    system: 'Sistema',
  },
  pages: {
    overview: {
      title: 'Visión general',
      description: 'Estado del hospital de un vistazo: ocupación, urgencias, flujos y alertas.',
      emptyTitle: 'Aún no hay datos del hospital',
      emptyDescription:
        'Los indicadores principales aparecerán aquí cuando se cargue el hospital simulado.',
    },
    beds: {
      title: 'Gestión de camas',
      description: 'Mapa de camas por unidad: libres, reservadas, ocupadas, limpieza y bloqueos.',
      emptyTitle: 'No hay camas registradas',
      emptyDescription:
        'El mapa de camas se mostrará cuando existan unidades y camas en el sistema.',
    },
    emergency: {
      title: 'Urgencias',
      description:
        'Pacientes en Urgencias por nivel de triaje, tiempos de espera y decisiones de ingreso.',
      emptyTitle: 'No hay pacientes en Urgencias',
      emptyDescription: 'El tablero de Urgencias aparecerá cuando lleguen pacientes simulados.',
    },
    admissions: {
      title: 'Ingresos y altas',
      description: 'Ingresos pendientes, programados y altas previstas del día.',
      emptyTitle: 'No hay ingresos ni altas pendientes',
      emptyDescription:
        'Aquí verá la cola de ingresos y las altas previstas cuando haya actividad.',
    },
    transfers: {
      title: 'Traslados internos',
      description: 'Solicitudes de traslado entre unidades y asignación de celadores.',
      emptyTitle: 'No hay traslados en curso',
      emptyDescription: 'Las solicitudes de traslado y su estado se mostrarán en esta cola.',
    },
    tracking: {
      title: 'Seguimiento de pacientes',
      description: 'Recorrido de cada paciente por el hospital y sus tiempos en cada etapa.',
      emptyTitle: 'No hay pacientes en seguimiento',
      emptyDescription: 'La línea de tiempo de cada paciente aparecerá aquí cuando haya eventos.',
    },
    settings: {
      title: 'Ajustes',
      description: 'Preferencias de la aplicación, simulador y datos de demostración.',
      emptyTitle: 'Sin ajustes disponibles todavía',
      emptyDescription: 'Las opciones del simulador y de la demo se añadirán en próximas fases.',
      tokensTitle: 'Colores de estado',
      tokensDescription: 'Muestra de los colores semánticos de la interfaz.',
      statusTokens: {
        ok: 'Correcto / disponible',
        warn: 'Atención',
        critical: 'Crítico',
        info: 'En curso',
        neutral: 'Neutro / bloqueado',
      },
      triageTitle: 'Niveles de triaje (Manchester)',
      triageLevel: (level: number) => `Nivel ${level}`,
    },
    notFound: {
      title: 'Página no encontrada',
      description: 'La dirección que ha abierto no existe o ha cambiado.',
      code: '404',
      backHome: 'Volver a la torre de control',
    },
  },
  common: {
    close: 'Cerrar',
    notifications: 'Notificaciones',
  },
  loading: 'Cargando…',
  pwa: {
    updateAvailable: 'Actualización disponible',
    updateDescription: 'Hay una nueva versión de Torre de Control.',
    updateAction: 'Actualizar',
    offlineReady: 'Lista para usar sin conexión',
  },
} as const

export type Messages = typeof es
