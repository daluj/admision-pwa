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
      unknown: '--:--',
    },
    alerts: {
      label: 'Alertas',
      count: (n: number) => (n === 1 ? '1 alerta activa' : `${n} alertas activas`),
      empty: 'No hay alertas activas',
    },
    user: {
      label: 'Usuario',
      role: 'Acceso de demostración',
      menu: 'Menú de usuario',
      unit: 'Unidad',
      logout: 'Cerrar sesión',
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
      demo: {
        title: 'Datos de demostración',
        description:
          'El hospital simulado se genera a partir de una semilla: la misma semilla produce siempre el mismo hospital.',
        currentSeed: 'Semilla actual',
        startedAt: 'Hora simulada de inicio',
        seedLabel: 'Semilla',
        seedHint: 'Número entero entre 0 y 999999.',
        seedInvalid: 'Introduzca un número entero entre 0 y 999999.',
        reset: 'Restablecer demo',
        resetting: 'Restableciendo…',
        confirmTitle: '¿Restablecer la demo?',
        confirmDescription: (seed: number) =>
          `Se borrarán todos los datos locales y el registro de eventos y se generará de nuevo el hospital con la semilla ${seed}.`,
        cancel: 'Cancelar',
        confirm: 'Restablecer',
        success: (seed: number) => `Demo restablecida con la semilla ${seed}`,
        failure: 'No se pudo restablecer la demo',
        notSeeded: 'Sin generar',
      },
      database: {
        title: 'Base de datos local',
        description: 'Los datos se guardan solo en este navegador.',
        backend: 'Origen de datos',
        backends: { dexie: 'IndexedDB', memory: 'Memoria (pruebas)' },
        schemaVersion: 'Versión del esquema',
        events: 'Eventos registrados',
        tablesTitle: 'Registros por tabla',
        tables: {
          specialty: 'Servicios',
          unit: 'Unidades',
          bed: 'Camas',
          patient: 'Pacientes',
          edVisit: 'Episodios de Urgencias',
          admission: 'Ingresos',
          bedRequest: 'Solicitudes de cama',
          transferRequest: 'Traslados',
          porter: 'Celadores',
          user: 'Usuarios',
          alert: 'Alertas',
          simulationState: 'Simulación',
        },
        emptyHint: 'Sin datos todavía: el hospital simulado se cargará en la siguiente fase.',
        loading: 'Cargando datos locales…',
      },
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
  startupError: {
    title: 'No se pudo iniciar Torre de Control',
    description:
      'La configuración del origen de datos no es válida. Revise la variable VITE_DATA_BACKEND (valores admitidos: dexie, memory).',
    detail: 'Detalle técnico',
  },
  loading: 'Cargando…',
  simulation: {
    controls: 'Control de la simulación',
    start: 'Iniciar simulación',
    pause: 'Pausar simulación',
    running: 'Simulación en marcha',
    paused: 'Simulación en pausa',
    speed: 'Velocidad de la simulación',
    speedOption: (speed: number) => `${speed}×`,
    speedChanged: (speed: number) => `Velocidad ${speed}×`,
    failed: 'No se pudo cambiar la simulación',
  },
  roles: {
    ADMISSIONS_HEAD: 'Jefe/a de Admisión',
    BED_MANAGER: 'Gestor/a de camas',
    NURSE_SUPERVISOR: 'Supervisor/a de enfermería',
    ED_COORDINATOR: 'Coordinación de Urgencias',
    PORTER: 'Celador/a',
    MANAGEMENT: 'Dirección',
  },
  login: {
    title: 'Torre de Control',
    subtitle: 'Elija un perfil para ver cómo ve el hospital cada rol.',
    simulated: 'Acceso simulado — sin contraseña',
    simulatedHint: 'Los usuarios son ficticios y solo existen en este navegador.',
    roleDescriptions: {
      ADMISSIONS_HEAD: 'Todo el hospital, ajustes y control de la simulación.',
      BED_MANAGER: 'Camas, ingresos y altas, traslados y seguimiento.',
      NURSE_SUPERVISOR: 'Camas y pacientes entrantes de su unidad.',
      ED_COORDINATOR: 'Urgencias, pacientes pendientes de ingreso y solicitudes de cama.',
      PORTER: 'Su cola de traslados: aceptar, recoger y entregar.',
      MANAGEMENT: 'Visión general y cuadros de mando, solo lectura.',
    },
    unitLabel: 'Unidad',
    enter: 'Entrar',
    enterAs: (role: string) => `Entrar como ${role}`,
    loading: 'Cargando datos de demostración…',
    emptyTitle: 'Aún no hay usuarios',
    emptyDescription: 'Los usuarios ficticios aparecerán en cuanto se cargue el hospital simulado.',
  },
  errors: {
    forbidden: 'No tienes acceso a esa sección',
  },
  scope: {
    unitOnly: (unit: string) => `Mostrando solo: ${unit}`,
  },
  pwa: {
    updateAvailable: 'Actualización disponible',
    updateDescription: 'Hay una nueva versión de Torre de Control.',
    updateAction: 'Actualizar',
    offlineReady: 'Lista para usar sin conexión',
  },
} as const

export type Messages = typeof es
