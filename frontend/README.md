# Frontend — Aplicación web del Sistema de Nómina Docente

Aplicación construida con **Next.js (App Router)**, **TypeScript estricto**, **Tailwind CSS** y **shadcn/ui**, organizada por funcionalidades (`auth`, `assignments`, `schedules`, `logbook`, `payroll`).

> **Estado:** el proyecto se inicializa en la etapa 1. Por ahora esta carpeta contiene la configuración de ejemplo y el espacio para los logos institucionales.

## Contenido previsto

| Ruta | Propósito |
| --- | --- |
| `src/app/` | Rutas y layouts de Next.js |
| `src/features/` | Funcionalidades, cada una con `components/`, `hooks/`, `api/`, `schemas/` y `types/` |
| `src/components/ui/`, `src/components/layout/` | Componentes base y de estructura |
| `src/lib/` | Cliente HTTP, formateadores de moneda y fecha, manejo de errores |
| `src/config/` | Configuración tipada leída de variables de entorno |
| `src/constants/` | Textos de la interfaz y rutas |
| `src/styles/` | Tokens de diseño (variables CSS) |
| `public/brand/` | Logos oficiales de la institución |

## Configuración

Copia `.env.example` a `.env.local` y ajusta los valores. La aplicación no inicia si falta alguna variable obligatoria.

Las instrucciones de instalación y ejecución se agregarán en la etapa 1.
