# MSP Metrics Portal

> **DinoCloud Internal - Confidential**

Dashboards centralizados de métricas de ClickUp para la operación MSP: conteos por
lista/estado/usuario, horas registradas, **MTTD/MTTR por lista**, comparación mensual,
filtros (fecha / carpeta / lista / usuario) y export a PDF.

App única en **Next.js 16 (App Router) + React 19 + TypeScript + Tailwind v4 + Recharts**.
Todo el acceso a ClickUp es server-side; el `CLICKUP_TOKEN` nunca llega al browser.

## Setup local

```bash
cp .env.example .env        # completar CLICKUP_TOKEN (pk_...)
npm install
npm run dev                 # http://localhost:3000
```

Scripts:

| Script | Qué hace |
|---|---|
| `npm run dev` | Server de desarrollo. |
| `npm run build` / `start` | Build de producción (output standalone) y arranque. |
| `npm run lint` / `typecheck` | ESLint y `tsc --noEmit`. |
| `npm test` | Tests de métricas (Vitest). |
| `npm run clickup:check` | Sanity check de la capa de datos contra la API real. |

## Arquitectura

- `src/lib/clickup/` — capa de datos: cliente HTTP (retry 429 + concurrencia), fetch de
  tareas/historial de estados, caché en memoria con TTL.
- `src/lib/metrics/` — cálculo de métricas (conteos, horas, MTTD/MTTR, mensual, extras).
- `src/app/` — páginas (Overview, Listas, Usuarios, Mensual, Reporte) + API
  (`/api/metrics`, `/api/options`, `/api/refresh`, `/api/health`).
- Filtros en la URL (`searchParams`), datos vía TanStack Query, botón 🔄 que limpia la caché.

### MTTD / MTTR

Se derivan del historial de estados (time-in-status), clasificando cada estado por su
`type` de ClickUp (open / custom / done / closed):

- **MTTD** = creación → primer estado activo (sale de `open`/backlog).
- **MTTR** = creación → primer estado done/closed.
- Se reporta media, mediana y p90 por lista. Casos borde (salto directo a done, reapertura,
  tareas sin historial) cubiertos y testeados.

### Horas

> Este workspace **no usa el time tracking por intervalos** de ClickUp (el endpoint
> `time_entries` va vacío), pero las tareas traen `time_spent` agregado. Por eso las horas
> salen de `task.time_spent`:
> - **Por lista**: exactas (suma de `time_spent`).
> - **Por usuario**: aproximadas — `time_spent` no tiene desglose por persona, así que se
>   reparte en partes iguales entre los asignados de la tarea.

## Datos

Scope: clientes activos (carpetas *MSP Latam clients* + *MSP US clients*), configurable por
`CLICKUP_ACTIVE_FOLDER_IDS`. La caché en memoria (TTL `MSP_CACHE_TTL`, default 30 min) se
trae una vez y los filtros se aplican en memoria; 🔄 fuerza re-fetch.

## Docker

```bash
docker compose up --build   # http://localhost:3000
```

## Deploy en AWS

Pendiente (fase de deploy, requiere aprobación). Estrategia de menor costo para pocos
usuarios: una sola imagen Next.js (EC2 t4g.small + CloudFront + Cognito + Secrets Manager,
~USD 15/mes; o serverless con OpenNext) + CI/CD por GitHub Actions con OIDC. Los secretos
(`CLICKUP_TOKEN`) viven en **AWS Secrets Manager**, nunca en el repo.
