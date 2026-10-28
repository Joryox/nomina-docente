/** Textos de la interfaz (es-MX). */
export const TEXTS = {
  metadata: {
    description: "Registro de clases, horario y bitácora docente, y recibo de nómina.",
  },
  layout: {
    skipToContent: "Saltar al contenido",
    mainNavigation: "Navegación principal",
    breadcrumbs: "Ruta de navegación",
    openNavigation: "Abrir el menú de navegación",
    closeNavigation: "Cerrar el menú de navegación",
    collapseSidebar: "Contraer la barra lateral",
    expandSidebar: "Expandir la barra lateral",
    userMenu: "Menú de la cuenta",
    appearance: "Apariencia",
    logout: "Cerrar sesión",
    loggingOut: "Cerrando sesión…",
    loadingUser: "Cargando tu cuenta…",
    authTagline:
      "Sistema de nómina para el personal docente: registra tus clases y consulta lo que te corresponde cada quincena.",
    authAsideFacts: [
      "Bitácora de clases con validación de horarios",
      "Cálculo quincenal automático con importes exactos",
      "Recibos con folio y copia fija de cada periodo",
    ],
  },
  status: {
    sessionRegistered: "Registrada",
    sessionPending: "Sin registrar",
    sessionLocked: "Bloqueada",
    sessionOffSchedule: "Fuera de horario",
    periodFuture: "Próxima",
    periodOpen: "En curso",
    periodClosed: "Lista para emitir",
    periodIssued: "Recibo emitido",
    active: "Activa",
    inactive: "Inactiva",
    warning: "Revisar",
  },
  theme: {
    label: "Tema de color",
    options: {
      system: "Como el sistema",
      light: "Claro",
      dark: "Oscuro",
    },
  },
  ui: {
    loading: "Cargando…",
    processing: "Procesando…",
    retry: "Intentar de nuevo",
    close: "Cerrar",
    notifications: "Notificaciones",
    cancel: "Cancelar",
    required: "obligatorio",
    optional: "(opcional)",
    requiredNote: "Los campos marcados con * son obligatorios.",
    characterCount: (count: number, max: number) => `${count} de ${max} caracteres`,
    select: {
      placeholder: "Selecciona una opción",
    },
    combobox: {
      placeholder: "Selecciona una opción",
      searchPlaceholder: "Escribe para buscar…",
      empty: "No hay coincidencias. Revisa lo que escribiste.",
    },
    password: {
      show: "Mostrar contraseña",
      hide: "Ocultar contraseña",
      capsLock: "Bloq Mayús está activado.",
    },
    datePicker: {
      placeholder: "Elige una fecha",
      openCalendar: "Abrir el calendario",
      today: "Hoy",
    },
    timeInput: {
      placeholder: "HH:MM",
      openList: "Elegir de la lista",
      listLabel: "Horas disponibles",
      snapped: (step: number) => `Se ajustó al intervalo de ${step} minutos más cercano.`,
      hint: "Formato de 24 horas. Usa las flechas ↑ ↓ para cambiar la hora.",
    },
    timeRange: {
      start: "Hora de entrada",
      end: "Hora de salida",
      duration: (text: string) => `Duración: ${text}`,
      durationParts: (hours: number, minutes: number) =>
        hours > 0 ? `${hours} h ${String(minutes).padStart(2, "0")} min` : `${minutes} min`,
    },
    table: {
      sortAscending: "Ordenar de menor a mayor",
      sortDescending: "Ordenar de mayor a menor",
      loading: "Cargando los registros…",
    },
    pagination: {
      label: "Paginación",
      previous: "Anterior",
      next: "Siguiente",
      page: (page: number) => `Página ${page}`,
      current: (page: number, total: number) => `Página ${page} de ${total}`,
      summary: (from: number, to: number, total: number) =>
        total === 0 ? "Sin registros" : `Mostrando ${from}–${to} de ${total}`,
    },
    confirm: {
      lossTitle: "Se perderá:",
      irreversible: "Esta acción no se puede deshacer.",
    },
  },
  auth: {
    login: {
      title: "Iniciar sesión",
      description: "Entra con el correo y la contraseña de tu cuenta de docente.",
      submit: "Iniciar sesión",
      submitting: "Iniciando sesión…",
      noAccount: "¿Aún no tienes cuenta?",
      goToRegister: "Regístrate",
      lockedTitle: "Tu cuenta está bloqueada temporalmente",
      lockedBody: (remaining: string) =>
        `Hubo varios intentos fallidos seguidos. Por seguridad podrás volver a entrar en ${remaining}.`,
      lockedOver: "El bloqueo terminó. Ya puedes iniciar sesión.",
      remainingMinutes: (minutes: number) => (minutes === 1 ? "1 minuto" : `${minutes} minutos`),
      remainingUnderMinute: "menos de un minuto",
    },
    register: {
      title: "Crear cuenta de docente",
      description: "Registra tus datos para llevar tu bitácora de clases y consultar tu nómina.",
      submit: "Crear cuenta",
      submitting: "Creando cuenta…",
      hasAccount: "¿Ya tienes cuenta?",
      goToLogin: "Inicia sesión",
      personalGroup: "Datos personales",
      personalGroupHint: "Así aparecerás en tus recibos de nómina.",
      accessGroup: "Datos de acceso",
      accessGroupHint: "Con ellos iniciarás sesión.",
    },
    fields: {
      email: "Correo electrónico",
      password: "Contraseña",
      passwordConfirmation: "Confirma la contraseña",
      currentPassword: "Contraseña actual",
      newPassword: "Contraseña nueva",
      newPasswordConfirmation: "Confirma la contraseña nueva",
      firstNames: "Nombre(s)",
      paternalSurname: "Apellido paterno",
      maternalSurname: "Apellido materno",
      employeeNumber: "Número de empleado",
    },
    hints: {
      email: "Con este correo iniciarás sesión.",
      maternalSurname: "Déjalo en blanco si solo tienes un apellido.",
      employeeNumber:
        "Es la clave que te asignó la institución, por ejemplo TESH-0042. Si la capturas, aparece en tus recibos.",
      emailReadOnly: "El correo identifica tu cuenta y no se puede cambiar.",
    },
    passwordRequirements: {
      title: "Tu contraseña debe:",
      met: "cumplido",
      notMet: "pendiente",
      loading: "Cargando los requisitos de la contraseña…",
      rules: {
        min_length: (min: number) => `Tener al menos ${min} caracteres.`,
        max_length: (max: number) => `Tener como máximo ${max} caracteres.`,
        letter_required: () => "Incluir al menos una letra.",
        digit_required: () => "Incluir al menos un número.",
        no_personal_data: () => "No contener tu nombre, tus apellidos ni tu correo.",
        not_common: () => "No ser una contraseña común (como «Password1234»).",
        not_current: () => "Ser distinta de tu contraseña actual.",
      },
      policyError:
        "No pudimos cargar los requisitos de la contraseña. Revisa tu conexión e intenta de nuevo.",
    },
  },
  profile: {
    title: "Mi perfil",
    description: "Tus datos personales, tu contraseña y las sesiones abiertas de tu cuenta.",
    loading: "Cargando tu perfil…",
    personal: {
      title: "Datos personales",
      description: "Así apareces en tus recibos de nómina.",
      submit: "Guardar cambios",
      submitting: "Guardando…",
      saved: "Datos guardados",
    },
    account: {
      title: "Cuenta",
      lastLogin: "Inicio de sesión más reciente",
      createdAt: "Cuenta creada",
      never: "Sin registro",
    },
    password: {
      title: "Cambiar contraseña",
      description: "Escribe tu contraseña actual y elige una nueva.",
      submit: "Cambiar contraseña",
      submitting: "Cambiando contraseña…",
      changedTitle: "Contraseña actualizada",
      changedBody:
        "Cerramos tu sesión en los demás dispositivos. En este sigues con la sesión abierta.",
    },
    sessions: {
      title: "Sesiones abiertas",
      description:
        "Si iniciaste sesión en una computadora ajena o perdiste un dispositivo, cierra todas tus sesiones.",
      action: "Cerrar sesión en todos los dispositivos",
      confirmTitle: "¿Cerrar sesión en todos los dispositivos?",
      confirmDescription:
        "Se cerrarán todas tus sesiones, incluida esta. Tus datos no cambian: solo tendrás que volver a iniciar sesión.",
      confirmConsequences: [
        "Las sesiones abiertas en otras computadoras, celulares o navegadores",
        "La sesión de este navegador",
      ],
      confirmLabel: "Cerrar todas las sesiones",
      done: "Cerraste sesión en todos tus dispositivos.",
    },
  },
  dashboard: {
    title: "Inicio",
    greeting: {
      morning: (name: string) => `Buenos días, ${name}`,
      afternoon: (name: string) => `Buenas tardes, ${name}`,
      evening: (name: string) => `Buenas noches, ${name}`,
      fallback: "Inicio",
    },
    loading: "Cargando tu resumen…",
    loadError: "No pudimos cargar tu resumen.",
    alerts: "Avisos",
    currentPeriod: "Quincena actual",
    stats: {
      hours: "Horas de la quincena",
      hoursDescription: (sessions: number) =>
        sessions === 1 ? "En 1 sesión registrada" : `En ${sessions} sesiones registradas`,
      amount: "Monto estimado",
      amountDescription:
        "Estimado con lo que llevas registrado. El importe final se fija al emitir el recibo.",
      pending: "Sesiones pendientes",
      pendingDescription: (count: number) =>
        count === 0
          ? "Tienes al día las clases que ya terminaron."
          : "Clases de esta quincena que ya terminaron y no has registrado.",
    },
    today: {
      title: "Clases de hoy",
      openLogbook: "Abrir la bitácora",
      register: "Registrar",
      registerAll: (count: number) => `Registrar las ${count}`,
      registered: "Registrada",
      upcoming: "Más tarde",
      upcomingHint: (end: string) => `Podrás registrarla al terminar, a las ${end}.`,
      empty: "Hoy no tienes clases en tu horario.",
      emptyHint: "Cuando tengas clases un día, aparecerán aquí para registrarlas con un clic.",
      allDone: "Registraste todas las clases de hoy que ya terminaron.",
    },
    pending: {
      title: (count: number) =>
        count === 1
          ? "Tienes 1 clase sin registrar en esta quincena"
          : `Tienes ${count} clases sin registrar en esta quincena`,
      body: "Si las impartiste, regístralas para que cuenten en tu recibo.",
      show: "Ver y registrar",
      dialogTitle: "Clases sin registrar",
      dialogDescription:
        "Clases de tu horario que ya terminaron y no están en tu bitácora. Registra las que impartiste.",
      more: (count: number) => `Y ${count} más. Registra estas y vuelve a abrir la lista.`,
    },
    unissued: {
      title: (period: string) => `La ${period} terminó y no tiene recibo`,
      body: "Revisa el total y emite el recibo para conservar una copia fija con folio.",
    },
    receipts: {
      title: "Últimos recibos",
      viewAll: "Ver todos",
      viewLabel: (period: string) => `Ver el recibo de la ${period}`,
      folio: "Folio",
      hours: "Horas",
      empty: "Aún no tienes recibos emitidos.",
      emptyHint:
        "Cuando termine una quincena con clases registradas, aquí aparecerá su recibo una vez emitido.",
    },
    setup: {
      title: "Configura tu cuenta",
      description:
        "Antes de registrar clases, el sistema necesita saber qué impartes y cuándo. Son tres pasos; cada uno se marca cuando lo completas.",
      progress: (done: number, total: number) => `${done} de ${total} pasos completos`,
      done: "Completo",
      pendingStep: "Pendiente",
      steps: {
        subjects: {
          title: "Registra tus materias",
          description: "Escribe el nombre de cada materia que impartes. Solo se hace una vez.",
          count: (count: number) =>
            count === 1 ? "1 materia registrada" : `${count} materias registradas`,
        },
        assignments: {
          title: "Crea tus clases",
          description:
            "Elige la materia, la carrera donde la impartes y tu tarifa por hora. Con esto se calcula tu pago.",
          count: (count: number) => (count === 1 ? "1 clase activa" : `${count} clases activas`),
          blocked: "Primero registra al menos una materia.",
        },
        schedules: {
          title: "Agrega tu horario semanal",
          description:
            "Indica qué día y a qué hora das cada clase. Así podrás registrar tus clases con un clic.",
          count: (count: number) =>
            count === 1 ? "1 horario registrado" : `${count} horarios registrados`,
          blocked: "Primero crea al menos una clase.",
        },
      },
      after:
        "Al terminar, esta página te mostrará tus clases de cada día, tus horas y el monto estimado de la quincena.",
    },
  },
  setupForms: {
    subject: {
      open: "Agregar materia",
      title: "Agregar materia",
      description: "Escribe el nombre como aparece en el plan de estudios.",
      name: "Nombre de la materia",
      nameHint: "Por ejemplo, Bases de Datos. El sistema corrige mayúsculas y espacios.",
      code: "Clave",
      codeHint: "Por ejemplo, SCD-1004.",
      submit: "Guardar materia",
      submitting: "Guardando materia…",
      saved: (name: string) => `Materia «${name}» registrada`,
    },
    assignment: {
      open: "Crear clase",
      title: "Crear clase",
      description: "Une una materia con la carrera donde la impartes y tu tarifa por hora.",
      subject: "Materia",
      subjectPlaceholder: "Elige una materia",
      career: "Carrera",
      careerPlaceholder: "Elige una carrera",
      rate: "Tarifa por hora",
      ratePlaceholder: "Elige una tarifa",
      rateHint: "La que te corresponde según tu contrato. Puedes cambiarla después.",
      submit: "Crear clase",
      submitting: "Creando clase…",
      saved: (subject: string, career: string) => `Asignación ${subject} – ${career} creada`,
      loadError: "No pudimos cargar las opciones. Cierra la ventana e intenta de nuevo.",
    },
    schedule: {
      open: "Agregar horario",
      title: "Agregar horario",
      description: "Una clase semanal: el día y las horas en que la impartes.",
      assignment: "Clase",
      assignmentPlaceholder: "Elige materia y carrera",
      weekday: "Día de la semana",
      weekdayPlaceholder: "Elige un día",
      submit: "Guardar horario",
      submitting: "Guardando horario…",
      saved: "Horario guardado",
      addAnother: "Si das la misma clase otro día, agrégalo como otro horario.",
    },
  },
  logbookActions: {
    registered: (count: number) =>
      count === 1
        ? "Clase registrada en tu bitácora"
        : `${count} clases registradas en tu bitácora`,
    registering: "Registrando…",
    registerLabel: (subject: string, range: string) => `Registrar ${subject}, ${range}`,
  },
  payrollActions: {
    issue: "Emitir recibo",
    confirmTitle: (period: string) => `¿Emitir el recibo de la ${period}?`,
    confirmDescription: (hours: string, amount: string) =>
      `El recibo se emitirá con ${hours} y un total de ${amount}.`,
    confirmLoading: "Calculando el total de la quincena…",
    confirmConsequences: [
      "La bitácora de esa quincena quedará cerrada: no podrás agregar, editar ni borrar sesiones",
      "El recibo conserva las horas, tarifas e importes de hoy aunque después cambien",
    ],
    confirmLabel: "Emitir recibo",
    issued: (folio: string) => `Recibo emitido con folio ${folio}`,
  },
  errorPages: {
    notFound: {
      title: "Página no encontrada",
      heading: "No encontramos esta página",
      body: "La dirección no existe o cambió. Revisa que esté bien escrita o vuelve al inicio.",
      action: "Ir al inicio",
      code: "Error 404",
    },
    unexpected: {
      title: "Ocurrió un error",
      heading: "Algo salió mal al mostrar esta página",
      body: "Tus datos están a salvo. Intenta de nuevo; si el problema sigue, avisa al área de sistemas.",
      retry: "Intentar de nuevo",
      home: "Ir al inicio",
      code: "Error inesperado",
    },
  },
  calendar: {
    weekdays: {
      1: "lunes",
      2: "martes",
      3: "miércoles",
      4: "jueves",
      5: "viernes",
      6: "sábado",
      7: "domingo",
    },
    /** Casillas de días del horario: L M X J V S D (X es miércoles, como en los calendarios). */
    weekdaysLetter: {
      1: "L",
      2: "M",
      3: "X",
      4: "J",
      5: "V",
      6: "S",
      7: "D",
    },
    weekdaysShort: {
      1: "lun",
      2: "mar",
      3: "mié",
      4: "jue",
      5: "vie",
      6: "sáb",
      7: "dom",
    },
    fortnights: {
      1: "1.ª quincena",
      2: "2.ª quincena",
    },
    hoursSuffix: "h",
  },
  /** Cómo se nombra una clase en toda la interfaz: «Programación Web · ISC · Grupo 3101». */
  classes: {
    separator: " · ",
    group: (group: string) => `Grupo ${group}`,
    shifts: { morning: "Matutino", afternoon: "Vespertino" },
    shiftLabel: (shift: string) => `Turno ${shift.toLowerCase()}`,
  },
} as const;
