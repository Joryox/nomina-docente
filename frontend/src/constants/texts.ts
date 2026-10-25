/** Textos de la interfaz (es-MX). */
export const TEXTS = {
  metadata: {
    description: "Registro de asignaciones, horarios y bitácora docente, y recibo de nómina.",
  },
  layout: {
    skipToContent: "Saltar al contenido",
  },
  auth: {
    login: {
      title: "Iniciar sesión",
      description: "Entra con el correo y la contraseña de tu cuenta de docente.",
      submit: "Iniciar sesión",
      submitting: "Iniciando sesión…",
      noAccount: "¿Aún no tienes cuenta?",
      goToRegister: "Regístrate",
    },
    register: {
      title: "Crear cuenta de docente",
      description: "Registra tus datos para llevar tu bitácora y consultar tus recibos de nómina.",
      submit: "Crear cuenta",
      submitting: "Creando cuenta…",
      hasAccount: "¿Ya tienes cuenta?",
      goToLogin: "Inicia sesión",
    },
    fields: {
      email: "Correo electrónico",
      password: "Contraseña",
      firstNames: "Nombre(s)",
      paternalSurname: "Apellido paterno",
      maternalSurname: "Apellido materno",
      employeeNumber: "Número de empleado",
      optional: "(opcional)",
    },
    hints: {
      email: "Con este correo iniciarás sesión.",
      maternalSurname: "Déjalo en blanco si solo tienes un apellido.",
      employeeNumber: "Letras, números y guiones, por ejemplo TESH-0042.",
    },
    passwordRequirements: {
      title: "Tu contraseña debe:",
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
    },
    panel: {
      title: "Panel del docente",
      greeting: (name: string) => `Sesión iniciada como ${name}`,
      provisional:
        "Página provisional de la etapa 3. Aquí aparecerán tus asignaciones, horarios, bitácora y recibos.",
      account: "Cuenta",
      employeeNumber: "Número de empleado",
      notCaptured: "Sin capturar",
      loading: "Cargando tu información…",
      logout: "Cerrar sesión",
      loggingOut: "Cerrando sesión…",
    },
  },
  systemStatus: {
    title: "Estado del sistema",
    description:
      "Página temporal de la etapa 1. Comprueba que la aplicación web, la API y la base de datos están conectadas.",
    checking: "Verificando…",
    refresh: "Volver a verificar",
    lastChecked: "Última verificación",
    labels: {
      api: "API",
      database: "Base de datos",
      version: "Versión de la API",
      environment: "Entorno",
    },
    status: {
      ok: "En servicio",
      degraded: "Con fallas",
      unavailable: "Sin conexión",
      unreachable: "Sin respuesta",
    },
    environments: {
      development: "Desarrollo",
      test: "Pruebas",
      production: "Producción",
    },
  },
} as const;
