# Historial de cambios

Todos los cambios relevantes del proyecto se registran aquí. El formato sigue [Keep a Changelog](https://keepachangelog.com/es-ES/1.1.0/) y el proyecto usa [versionado semántico](https://semver.org/lang/es/).

## [1.1.0] - 2026-10-27

Grupos y horarios de varios días: la misma materia puede darse a varios grupos y el horario de una semana se captura en un solo paso.

### Agregado

- **Grupo de la clase** (opcional, por ejemplo «3101»): la misma materia y carrera puede existir en grupos distintos. Se guarda normalizado y aparece en Mis clases, Horario, Bitácora, Inicio, la vista previa, el detalle del recibo y el PDF («Programación Web · ISC · Grupo 3101»).
- **Horarios de varios días en una captura:** casillas L M X J V S D con uno o más rangos de horas. Se guardan todos o ninguno; si un día choca con otra clase, el mensaje dice qué día y con cuál.
- **Turno matutino o vespertino** calculado por el sistema según la hora de entrada (umbral configurable con `AFTERNOON_SHIFT_START`).
- **Integración continua** con GitHub Actions: Ruff, mypy y pytest con PostgreSQL en el backend; lint, tipos, formato, pruebas, contratos de la API y build en el frontend.
- Datos de demostración con una materia en dos grupos el mismo día y otra impartida tres días a la semana.

### Cambiado

- La unicidad de clases activas incluye el grupo; dos clases sin grupo de la misma materia y carrera siguen siendo un duplicado.
- Los mensajes de empalme nombran el día de la captura, la clase con la que choca y su grupo.
- Créditos y datos de autor completos en el README, la licencia y los manifiestos.

### Notas

- Los recibos emitidos antes de esta versión no cambian: sus renglones quedan sin grupo.
- Migración `5e7a1c9d3b42`; ejecuta `bash scripts/migrate.sh` al actualizar.

## [1.0.0] - 2026-10-27

Primera versión completa: un docente puede ir de cero a descargar su recibo de nómina en PDF.

### Agregado

- **Cuentas de docente:** registro, inicio de sesión, perfil, cambio de contraseña y cierre de sesión en todos los dispositivos. Política de contraseñas publicada por la API y revisada en vivo; bloqueo temporal tras intentos fallidos con aviso del tiempo restante.
- **Inicio:** quincena actual, horas y monto estimado, clases de hoy para registrar en un clic, avisos con acción y guía de configuración para docentes nuevos.
- **Mis materias, Mis clases y Horario:** catálogos de carreras y tarifas por selección, alta de materias desde el mismo formulario, horario semanal con detección de empalmes que nombra la clase en conflicto.
- **Bitácora:** clases programadas del día con horario precargado, registro rápido de varias clases, sesiones fuera de horario con aviso, filtros por quincena y clase, periodos cerrados con candado.
- **Recibos:** vista previa por quincena, emisión con folio consecutivo, detalle como documento oficial con importe con letra y espacios de firma, impresión limpia y PDF tamaño carta.
- **Sistema de diseño:** tokens en OKLCH con modo claro y oscuro, componentes accesibles sobre Radix, guía viva en desarrollo y animaciones sutiles que respetan «reducir movimiento».
- **Marca en un paso:** `scripts/apply-brand.sh` aplica logos y color institucional en la interfaz y en el PDF.
- **Cuenta de demostración** con datos ficticios (`scripts/demo-data.sh`).

### Seguridad

- JWT revocable en cookie `HttpOnly`, refresh token rotativo con detección de reuso, Argon2id, CSRF _double-submit_ en todas las escrituras.
- Aislamiento de datos entre docentes en servicio, repositorio y base de datos (un recurso ajeno responde 404).
- Política de seguridad de contenidos y cabeceras de endurecimiento en la API y en las páginas; HSTS en producción.
- Dependencias auditadas con `pip-audit` y `npm audit` sin vulnerabilidades conocidas.

### Notas

- El folio del recibo nunca se repite, pero puede tener saltos si una emisión falla después de reservar su número.
- No se calculan deducciones (ISR, IMSS); el recibo muestra el importe bruto.

[1.1.0]: https://github.com/Joryox/nomina-docente/compare/v1.0.0...v1.1.0
[1.0.0]: https://github.com/Joryox/nomina-docente/releases/tag/v1.0.0
