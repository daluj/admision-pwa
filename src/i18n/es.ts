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
      status: {
        AVAILABLE: 'Libre',
        RESERVED: 'Reservada',
        OCCUPIED: 'Ocupada',
        PENDING_CLEANING: 'Pendiente de limpieza',
        CLEANING: 'En limpieza',
        BLOCKED: 'Bloqueada',
      },
      unitTypes: {
        WARD: 'Planta',
        ICU: 'UCI',
        INTERMEDIATE: 'Cuidados intermedios',
        ED: 'Urgencias',
        OTHER: 'Otra',
      },
      kpis: {
        label: 'Indicadores de camas',
        occupancy: {
          label: 'Ocupación',
          context: (occupied: number, operational: number) =>
            `${occupied} de ${operational} camas operativas`,
          target: (pct: number) => `umbral de alerta ${pct} %`,
        },
        free: {
          label: 'Camas libres',
          context: (reserved: number) =>
            reserved === 1 ? '1 reservada' : `${reserved} reservadas`,
        },
        pendingCleaning: {
          label: 'Pendientes de limpieza',
          context: (cleaning: number) =>
            cleaning === 1 ? '1 en limpieza' : `${cleaning} en limpieza`,
        },
        blocked: {
          label: 'Bloqueadas',
          context: (pct: number) => `${pct} % de las camas`,
        },
        expectedDischarges: {
          label: 'Altas previstas hoy',
          context: (done: number) => (done === 1 ? '1 ya realizada' : `${done} ya realizadas`),
        },
        turnaround: {
          label: 'Rotación de cama',
          context: (count: number) => (count === 1 ? '1 cama hoy' : `${count} camas hoy`),
          none: 'sin datos todavía',
          target: (minutes: number) => `objetivo ≤ ${minutes} min`,
        },
        outliers: {
          label: 'Pacientes ectópicos',
          context: (units: number) =>
            units === 0 ? 'ninguno' : units === 1 ? 'en 1 unidad' : `en ${units} unidades`,
        },
      },
      exceptions: {
        blockedLong: (bed: string, age: string) => `Cama ${bed} bloqueada desde hace ${age}`,
        cleaningLong: (bed: string, age: string) =>
          `Cama ${bed} pendiente de limpieza desde hace ${age}`,
        reason: (reason: string) => `Motivo: ${reason}`,
        unitFull: (unit: string, pct: number) => `${unit} al ${pct} % de ocupación`,
        outlier: (initials: string, unit: string) => `${initials} ectópico en ${unit}`,
        outlierDetail: (bed: string, specialty: string) => `Cama ${bed} · servicio ${specialty}`,
      },
      filters: {
        label: 'Filtros',
        building: 'Edificio',
        type: 'Tipo de unidad',
        specialty: 'Servicio',
        all: 'Todos',
        clear: 'Quitar filtros',
      },
      requests: {
        title: 'Solicitudes de cama',
        counts: (open: number, assigned: number) =>
          `${open === 1 ? '1 abierta' : `${open} abiertas`} · ${assigned} con cama reservada`,
        empty: 'No hay solicitudes de cama abiertas.',
        priority: (priority: string) => `Prioridad ${priority.slice(1)}`,
        sourceEd: (triage?: number) => (triage ? `Urgencias · triaje ${triage}` : 'Urgencias'),
        sourceScheduled: 'Programado',
        isolation: 'Aislamiento',
        waiting: 'Espera',
        assign: 'Asignar cama',
        assignFor: (initials: string) => (initials ? `Asignar cama a ${initials}` : 'Asignar cama'),
        list: 'Solicitudes abiertas',
      },
      bedSheet: {
        title: (bed: string) => `Cama ${bed}`,
        readOnly: 'Solo lectura: su rol no puede modificar esta cama.',
        occupied: 'Cama ocupada: no hay acciones disponibles.',
        patient: (initials: string) => `Paciente ${initials}`,
        actions: 'Acciones',
        block: {
          title: 'Bloquear cama',
          reason: 'Motivo del bloqueo',
          presets: 'Motivos habituales',
          preset: 'Elegir un motivo…',
          submit: 'Bloquear cama',
          required: 'Indique el motivo del bloqueo.',
        },
        release: {
          title: 'Liberar reserva',
          reason: 'Motivo (opcional)',
          submit: 'Liberar reserva',
        },
        startCleaning: 'Iniciar limpieza',
        finishCleaning: 'Terminar limpieza',
        unblock: 'Desbloquear cama',
        working: 'Procesando…',
        blockReasons: [
          'Avería de la cama',
          'Obras en la habitación',
          'Aislamiento ambiental',
          'Falta de personal de enfermería',
          'Revisión de mantenimiento',
        ],
      },
      assignSheet: {
        title: 'Asignar cama',
        description: (who: string, specialty: string, unitType: string) =>
          `${who ? `${who} · ` : ''}${specialty} · ${unitType}`,
        suggested: 'Camas sugeridas',
        all: 'Camas libres compatibles',
        none: 'No hay camas libres compatibles ahora mismo.',
        showAll: (count: number) => `Ver todas las camas libres compatibles (${count})`,
        showLess: 'Ver solo las sugeridas',
        tags: {
          SPECIALTY: 'Mismo servicio',
          OUTLIER: 'Ectópico',
          ISOLATION: 'Aislamiento',
        },
        reserve: 'Reservar cama',
        reserving: 'Reservando…',
        close: 'Cerrar',
        selectHint: 'Elija una cama para reservarla.',
        dismiss: 'Entendido',
        gone: 'Esa solicitud ya no está abierta: otra persona o la simulación la ha atendido.',
        bedTaken: 'La cama elegida ya no está libre. Elija otra.',
      },
      actions: {
        toast: {
          reserve: (bed: string, initials: string) =>
            initials ? `Cama ${bed} reservada para ${initials}` : `Cama ${bed} reservada`,
          release: (bed: string) => `Cama ${bed}: reserva liberada`,
          block: (bed: string) => `Cama ${bed} bloqueada`,
          unblock: (bed: string) => `Cama ${bed} desbloqueada`,
          startCleaning: (bed: string) => `Cama ${bed}: limpieza iniciada`,
          finishCleaning: (bed: string) => `Cama ${bed}: limpieza terminada, disponible`,
        },
        errors: {
          forbidden: 'No tiene permiso para esta acción.',
          stale: 'Esa cama o solicitud ya no está disponible.',
          failed: 'No se pudo completar la acción. Inténtelo de nuevo.',
        },
      },
      noUnit: {
        title: 'Sin unidad asignada',
        description:
          'Su usuario no tiene una unidad asignada, así que no puede ver ninguna. Pida a un administrador que se la asigne.',
      },
      unit: {
        back: 'Todas las unidades',
        notFoundTitle: 'Unidad no encontrada',
        notFoundDescription: (code: string) => `No existe ninguna unidad con el código ${code}.`,
        loading: 'Cargando la unidad…',
        header: (building: string, floor: number, type: string) =>
          `${building} · planta ${floor} · ${type}`,
        services: (names: string) => `Servicios: ${names}`,
        mapTitle: 'Mapa de camas',
        room: (room: string) => `Hab. ${room}`,
        legend: 'Leyenda',
        stay: (duration: string) => `Estancia ${duration}`,
        discharge: {
          expected: (when: string) => `Alta ${when}`,
          ordered: 'Alta ordenada',
          none: 'Sin alta prevista',
        },
        outlier: 'Ectópico',
        reservedFor: 'Reservada para',
        since: 'desde hace',
        detail: {
          patient: 'Paciente',
          mrn: 'NHC',
          admittedAt: 'Ingreso',
          specialty: 'Servicio',
          unitSpecialties: 'Servicios de la unidad',
        },
      },
      grid: {
        title: 'Unidades',
        occupancy: (pct: number) => `${pct} %`,
        floor: (building: string, floor: number) => `${building} · planta ${floor}`,
        outliers: (n: number) => (n === 1 ? '1 ectópico' : `${n} ectópicos`),
        openUnit: (name: string) => `Abrir el mapa de camas de ${name}`,
        statusBar: (name: string, summary: string) => `${name}: ${summary}`,
        noMatches: 'Ninguna unidad coincide con los filtros.',
        loading: 'Cargando camas…',
      },
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
      loading: 'Cargando Urgencias…',
      kpis: {
        label: 'Indicadores de Urgencias',
        present: {
          label: 'Pacientes presentes',
          context: (boxes: number, waitingRoom: number) =>
            `${boxes} en boxes · ${waitingRoom} en sala de espera`,
        },
        waitingTriage: {
          label: 'Esperando triaje',
          context: (oldest: string | null) =>
            oldest ? `espera máx. ${oldest}` : 'nadie esperando',
        },
        waitingPhysician: {
          label: 'Esperando médico',
          context: (over: number) =>
            over === 0
              ? 'todos dentro de objetivo'
              : over === 1
                ? '1 por encima del objetivo'
                : `${over} por encima del objetivo`,
        },
        boarding: {
          label: 'Pendientes de ingreso',
          context: (withBed: number) =>
            withBed === 1 ? '1 con cama reservada' : `${withBed} con cama reservada`,
        },
        longestBoarding: {
          label: 'Mayor espera de cama',
          context: (over: number) =>
            over === 0
              ? 'ninguno por encima de 4 h'
              : over === 1
                ? '1 paciente > 4 h'
                : `${over} pacientes > 4 h`,
        },
        withinTarget: {
          label: 'Atendidos en objetivo',
          context: (within: number, seen: number) => `${within} de ${seen} atendidos en 24 h`,
          none: 'sin datos todavía',
          target: (pct: number) => `objetivo ≥ ${pct} %`,
        },
      },
      exceptions: {
        triageBreach: (initials: string, level: number, wait: string) =>
          `${initials} (triaje ${level}) espera médico desde hace ${wait}`,
        triageDetail: (targetMin: number) =>
          targetMin === 0 ? 'Debe ser atendido de inmediato' : `Objetivo: ${targetMin} min`,
        boardingLong: (initials: string, since: string) =>
          `${initials} pendiente de cama desde hace ${since}`,
      },
      board: {
        title: 'Tablero de Urgencias',
        columns: {
          ARRIVED: 'Llegada',
          TRIAGED: 'Triado',
          IN_ASSESSMENT: 'En atención',
          ADMIT_DECISION: 'Pendiente de ingreso',
        },
        empty: 'Sin pacientes',
        noTriage: 'Sin triar',
        areas: {
          BOXES: 'Boxes',
          OBSERVATION: 'Observación',
          RESUS: 'Reanimación',
          WAITING_ROOM: 'Sala de espera',
        },
        target: (minutes: number) => (minutes === 0 ? 'inmediato' : `objetivo ${minutes} min`),
        detail: { patient: 'Paciente', mrn: 'NHC', complaint: 'Motivo', area: 'Ubicación' },
      },
      boarding: {
        title: 'Pendientes de ingreso',
        description:
          'Pacientes con decisión de ingreso que esperan cama, los de más espera primero.',
        columns: {
          patient: 'Paciente',
          service: 'Servicio',
          since: 'Espera de cama',
          bed: 'Estado de la cama',
        },
        isolation: 'Aislamiento',
        states: {
          noBed: 'Sin cama asignada',
          reserved: (bed: string, unit: string) => `Cama ${bed} reservada (${unit})`,
          inTransfer: (bed: string) => `En traslado a ${bed}`,
        },
        manage: 'Gestionar en Camas',
        empty: 'No hay pacientes pendientes de ingreso.',
      },
      chart: {
        title: 'Atendidos en objetivo por hora (últimas 24 h)',
        description:
          'Porcentaje de pacientes de triaje 2–5 vistos por un médico dentro de su objetivo Manchester.',
        objective: (pct: number) => `Objetivo ${pct} %`,
        point: (within: number, seen: number) => `${within} de ${seen} dentro de objetivo`,
        seriesName: '% en objetivo',
        table: { hour: 'Hora', seen: 'Atendidos', within: 'En objetivo', pct: '% en objetivo' },
        noData: 'sin datos',
        partial: 'hora en curso',
      },
    },
    admissions: {
      title: 'Ingresos y altas',
      description: 'Ingresos pendientes, programados y altas previstas del día.',
      emptyTitle: 'No hay ingresos ni altas pendientes',
      emptyDescription:
        'Aquí verá la cola de ingresos y las altas previstas cuando haya actividad.',
      loading: 'Cargando ingresos y altas…',
      scopeNotice: (unit: string) => `Mostrando solo: ${unit}`,
      noUnit: {
        title: 'Sin unidad asignada',
        description:
          'Su usuario no tiene una unidad asignada, así que no puede ver ninguna. Pida a un administrador que se la asigne.',
      },
      kpis: {
        label: 'Indicadores de ingresos y altas',
        admittedToday: {
          label: 'Ingresos hoy',
          context: (urgent: number, scheduled: number) =>
            `${urgent} urgentes · ${scheduled} programados`,
        },
        scheduledPending: {
          label: 'Programados pendientes',
          context: (arrived: number) =>
            arrived === 1 ? '1 ya ha llegado' : `${arrived} ya han llegado`,
        },
        discharged: {
          label: 'Altas realizadas',
          context: (expected: number) => `de ${expected} previstas hoy`,
        },
        beforeNoon: {
          label: 'Altas antes de las 12:00',
          context: (before: number, total: number) => `${before} de ${total} altas de hoy`,
          none: 'sin altas todavía',
          target: (pct: number) => `objetivo ≥ ${pct} %`,
        },
        balance: {
          label: 'Balance de camas',
          context: 'libres + altas previstas − pendientes',
        },
        cancelledNoBed: {
          label: 'Cancelados por falta de cama',
          context: 'ingresos programados de hoy',
        },
      },
      exceptions: {
        balanceDeficit: (value: number) => `Déficit de camas previsto hoy: ${value}`,
        scheduledLate: (initials: string, since: string) =>
          `${initials} (programado) espera cama desde hace ${since} sobre su hora`,
        dischargeStuck: (initials: string, bed: string, since: string) =>
          `${initials} · cama ${bed}: alta ordenada hace ${since} y sigue ingresado`,
      },
      scheduled: {
        title: 'Ingresos programados de hoy',
        counts: (pending: number, arrived: number, admitted: number, cancelled: number) =>
          `${pending} pendientes · ${arrived} llegados · ${admitted} ingresados · ${cancelled} cancelados`,
        columns: { time: 'Hora', patient: 'Paciente', service: 'Servicio', status: 'Estado' },
        status: {
          PENDING: 'Pendiente',
          ARRIVED: 'Llegado · esperando cama',
          BED_RESERVED: 'Cama reservada',
          ADMITTED: 'Ingresado',
          CANCELLED: 'Cancelado',
        },
        cancelReasons: {
          NO_BED: 'sin cama',
          PATIENT: 'paciente',
          CLINICAL: 'motivo clínico',
          OTHER: 'otro motivo',
        },
        empty: 'No hay ingresos programados para hoy.',
      },
      balance: {
        title: 'Previsión de balance de camas',
        description:
          'Camas libres ahora más altas previstas pendientes, menos pacientes que necesitan cama.',
        available: 'Camas libres ahora',
        expectedRemaining: 'Altas previstas pendientes hoy',
        boarding: 'Pendientes de ingreso (Urgencias)',
        scheduledPending: 'Programados pendientes',
        result: 'Balance previsto',
        deficit: (value: number) =>
          `Déficit de ${Math.abs(value)} camas: hay que liberar camas o reorganizar ingresos.`,
        ok: 'Hay camas suficientes para la demanda prevista de hoy.',
      },
      units: {
        title: 'Altas por unidad',
        columns: {
          unit: 'Unidad',
          expected: 'Previstas',
          done: 'Realizadas',
          pending: 'Pendientes',
          ordered: 'Ordenadas',
          beforeNoon: 'Antes de las 12:00',
        },
        total: 'Total',
        empty: 'Ninguna unidad tiene altas previstas o realizadas hoy.',
      },
      worklist: {
        title: 'Altas de los pacientes ingresados',
        description: 'Fije o edite el alta prevista y ordene el alta cuando proceda.',
        tabs: {
          today: 'Previstas hoy',
          ordered: 'Ordenadas',
          upcoming: 'Próximos días',
          none: 'Sin fecha prevista',
        },
        columns: {
          bed: 'Cama',
          patient: 'Paciente',
          service: 'Servicio',
          stay: 'Estancia',
          expected: 'Alta prevista',
          actions: 'Acciones',
        },
        overdue: 'vencida',
        ordered: 'Alta ordenada',
        none: 'Sin fecha',
        showMore: (remaining: number) => `Ver más (${remaining})`,
        empty: 'No hay pacientes en esta lista.',
        readOnly: 'Solo lectura',
        edit: 'Fijar alta prevista',
        editExisting: 'Editar alta prevista',
        order: 'Ordenar alta',
      },
      expectedSheet: {
        title: 'Alta prevista',
        description: (label: string) => `Cama ${label}`,
        day: 'Día',
        days: ['Hoy', 'Mañana', 'Pasado mañana'],
        time: 'Hora (24 h)',
        save: 'Guardar alta prevista',
        saving: 'Guardando…',
        invalid: {
          required: 'Indique la hora.',
          past: 'La hora debe ser posterior a la hora actual.',
        },
      },
      orderSheet: {
        title: 'Ordenar alta',
        description: (label: string) => `Cama ${label}`,
        body: 'El paciente pasa a «Alta ordenada». La cama quedará pendiente de limpieza cuando salga.',
        confirm: 'Ordenar alta',
        working: 'Procesando…',
      },
      actions: {
        toast: {
          setExpected: (label: string) => `Alta prevista guardada · ${label}`,
          order: (label: string) => `Alta ordenada · ${label}`,
        },
        errors: {
          forbidden: 'No tiene permiso para esta acción.',
          stale: 'El paciente ya no está en esa situación. Actualizando…',
          failed: 'No se pudo completar la acción. Inténtelo de nuevo.',
        },
      },
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
      eventLog: {
        title: 'Registro de eventos',
        description: 'Todo lo que ocurre en el hospital, del más reciente al más antiguo.',
        filters: 'Filtros del registro',
        type: 'Tipo de evento',
        entity: 'Entidad',
        window: 'Periodo',
        all: 'Todos',
        windows: {
          '1h': 'Última hora',
          '6h': 'Últimas 6 horas',
          '24h': 'Últimas 24 horas',
          all: 'Todo',
        },
        columns: {
          seq: 'N.º',
          time: 'Hora simulada',
          type: 'Evento',
          entity: 'Entidad',
          actor: 'Origen',
          detail: 'Detalle',
        },
        simulator: 'Simulador',
        details: {
          triage: (level: number) => `Nivel ${level}`,
          specialty: (code: string) => `Servicio ${code}`,
          bedRequest: (priority: string, unitType: string) => `Prioridad ${priority} · ${unitType}`,
          unitTypes: {
            WARD: 'Planta',
            ICU: 'UCI',
            INTERMEDIATE: 'Cuidados intermedios',
            ED: 'Urgencias',
            OTHER: 'Otra',
          },
          reasonCodes: { ADMISSION_CANCELLED: 'Ingreso cancelado' } as Record<string, string>,
          speed: (speed: number) => `${speed}×`,
          seed: (seed: number) => `Semilla ${seed}`,
          reason: (reason: string) => `Motivo: ${reason}`,
          outcomes: {
            ADMITTED: 'Ingresa en planta',
            DISCHARGED_HOME: 'Alta a domicilio',
            LWBS: 'Se marcha sin ser atendido',
            TRANSFERRED_OUT: 'Derivado a otro centro',
            DECEASED: 'Éxitus',
          },
          cancelReasons: {
            NO_BED: 'Sin cama',
            PATIENT: 'Decisión del paciente',
            CLINICAL: 'Motivo clínico',
            OTHER: 'Otro motivo',
          },
          transferReasons: {
            ADMISSION: 'Ingreso',
            INTER_UNIT: 'Entre unidades',
            TEST: 'Prueba diagnóstica',
            SURGERY: 'Quirófano',
            RETURN: 'Regreso',
          },
          transferPriorities: { URGENT: 'Urgente', NORMAL: 'Normal' },
        },
        empty: 'No hay eventos que coincidan.',
        emptyHint: 'Inicie la simulación desde la barra superior para ver actividad.',
        loading: 'Cargando eventos…',
        showing: (shown: number, loaded: number) =>
          `Mostrando ${shown} de los últimos ${loaded} eventos cargados`,
        loadMore: 'Cargar más',
        types: {
          EdPatientArrived: 'Llegada a Urgencias',
          EdPatientTriaged: 'Triaje',
          EdAssessmentStarted: 'Inicio de atención',
          AdmissionDecided: 'Decisión de ingreso',
          EdPatientLeft: 'Salida de Urgencias',
          ScheduledAdmissionCreated: 'Ingreso programado',
          BedRequested: 'Cama solicitada',
          BedReserved: 'Cama reservada',
          BedReservationReleased: 'Reserva liberada',
          PatientAdmitted: 'Ingreso en cama',
          ExpectedDischargeSet: 'Alta prevista',
          DischargeOrdered: 'Alta ordenada',
          PatientDischarged: 'Alta',
          PatientTransferredBetweenBeds: 'Cambio de cama',
          BedCleaningStarted: 'Limpieza iniciada',
          BedCleaningFinished: 'Limpieza terminada',
          BedBlocked: 'Cama bloqueada',
          BedUnblocked: 'Cama desbloqueada',
          TransferRequested: 'Traslado solicitado',
          TransferAssigned: 'Traslado asignado',
          TransferPickedUp: 'Traslado recogido',
          TransferDelivered: 'Traslado entregado',
          TransferCancelled: 'Traslado cancelado',
          AdmissionCancelled: 'Ingreso cancelado',
          AlertRaised: 'Alerta generada',
          AlertAcknowledged: 'Alerta reconocida',
          AlertResolved: 'Alerta resuelta',
          DemoSeeded: 'Demo restablecida',
          SimulationStarted: 'Simulación iniciada',
          SimulationPaused: 'Simulación en pausa',
          SimulationSpeedChanged: 'Velocidad cambiada',
        },
        entities: {
          Specialty: 'Servicio',
          Unit: 'Unidad',
          Bed: 'Cama',
          Patient: 'Paciente',
          EdVisit: 'Episodio de Urgencias',
          Admission: 'Ingreso',
          BedRequest: 'Solicitud de cama',
          TransferRequest: 'Traslado',
          Porter: 'Celador',
          User: 'Usuario',
          Alert: 'Alerta',
          SimulationState: 'Simulación',
        },
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
  dashboard: {
    status: {
      ok: 'Correcto',
      warn: 'Atención',
      critical: 'Crítico',
      info: 'Informativo',
      neutral: '',
    },
    exceptions: {
      title: 'Necesita atención',
      empty: 'Nada requiere atención ahora mismo.',
      showAll: (total: number) => `Ver todas (${total})`,
      showLess: 'Ver menos',
    },
    duration: {
      lessThanMinute: '<1 min',
      minutes: (m: number) => `${m} min`,
      hoursMinutes: (h: number, m: number) => (m === 0 ? `${h} h` : `${h} h ${m} min`),
      daysHours: (d: number, h: number) => (h === 0 ? `${d} d` : `${d} d ${h} h`),
    },
    day: { today: 'hoy', tomorrow: 'mañana', yesterday: 'ayer' },
    triage: (level: number) => `Triaje ${level}`,
    late: { warn: 'Por encima del objetivo', critical: 'Muy por encima del objetivo' },
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
