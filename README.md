# MSP Metrics Portal

> **DinoCloud Internal - Confidential**

Dashboards centralizados de métricas de ClickUp para la operación MSP: conteos por
cliente/estado/ingeniero/mes, horas trackeadas, **MTTD/MTTR por lista**, comparación
mensual, **distinción tarea/subtarea**, filtros (fecha / carpeta / cliente / ingeniero)
con chips de filtros activos, y export a PDF.

App única en **Next.js 16 (App Router) + React 19 + TypeScript + Tailwind v4 + Recharts**.
Todo el acceso a ClickUp es server-side; el `CLICKUP_TOKEN` nunca llega al browser. En
producción el acceso está protegido por **Cognito + MFA** (ver [Autenticación](#autenticación)).

## Setup local

```bash
cp .env.example .env        # completar CLICKUP_TOKEN (pk_...)
npm install
npm run dev                 # http://localhost:3000
```

> La **auth se desactiva sola en local** (sin variables de Cognito no hay login). Para
> forzarlo, `AUTH_DISABLED=1`. En prod, el `proxy.ts` protege todas las rutas.

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
  tareas + subtareas + historial de estados + imputaciones (time entries), caché en memoria con TTL.
- `src/lib/metrics/` — cálculo de métricas (conteos, horas, MTTD/MTTR, mensual, subtareas).
- `src/lib/rex/` — métricas de la lista **Rex Adoption** (fetch + cálculo propios).
- `src/lib/auth/` — OIDC contra Cognito (config, sesión firmada, PKCE) + `src/proxy.ts`
  (protege todas las rutas; en Next 16 `middleware` se renombró a `proxy`).
- `src/app/` — páginas (Overview, Clientes, Ingenieros, Mensual, Rex, Reporte) + API
  (`/api/metrics`, `/api/options`, `/api/refresh`, `/api/rex`, `/api/users/[id]`,
  `/api/health`, `/api/auth/{login,callback,logout}`).
- Filtros en la URL (`searchParams`) + **chips de filtros activos**, datos vía TanStack
  Query, botón 🔄 que limpia la caché.

### Tareas vs subtareas

Las **subtareas no cuentan como tickets**: se excluyen de todos los conteos (total,
creadas, abiertas, resueltas, por estado/prioridad, mensual, MTTD/MTTR y conteos por
cliente/ingeniero). Sus **horas sí cuentan**. El desglose de subtareas se muestra aparte
(columna "Subtareas" en Clientes/Ingenieros/Mensual, KPI en Overview, contador en Rex).

### MTTD / MTTR

Se derivan del historial de estados (time-in-status), clasificando cada estado por su
`type` de ClickUp (open / custom / done / closed):

- **MTTD** = creación → primer estado activo (sale de `open`/backlog).
- **MTTR** = creación → primer estado done/closed.
- Se reporta media, mediana y p90 por lista. Casos borde (salto directo a done, reapertura,
  tareas sin historial) cubiertos y testeados.

### Horas

> Las horas salen de las **imputaciones (time entries / intervalos)** de ClickUp, traídas
> por tarea vía `/task/{id}/time` (el endpoint a nivel team requiere permisos que el token
> no tiene). Cada intervalo trae **fecha + usuario + duración**, así que:
> - **Por lista / por mes**: exactas (suma de los intervalos con fecha dentro del rango).
> - **Por ingeniero**: exactas según quién imputó (no se reparten entre asignados).
> - Incluyen el tiempo cargado en subtareas.

## Datos

Scope: clientes activos (carpetas *MSP Latam clients* + *MSP US clients*), configurable por
`CLICKUP_ACTIVE_FOLDER_IDS`. La caché en memoria (TTL `MSP_CACHE_TTL`, default 30 min) se
trae una vez y los filtros se aplican en memoria; 🔄 fuerza re-fetch.

## Docker

```bash
docker compose up --build   # http://localhost:3000
```

## Deploy en AWS

En producción en **AWS App Runner** (1 vCPU / 2 GB, min 1 instancia para mantener la caché
tibia) detrás de **Cognito + MFA**, dominio **https://mspportal.lab.dinocloud.co** (TLS/ACM
+ Route 53), ventana de servicio L–V 9–20 ART, ~USD 8–10/mes. Secretos en **AWS Secrets
Manager** (nunca en el repo).

**Deploy por CI/CD** (GitHub Actions + OIDC, sin access keys): push/PR a `main` → aprobación
del environment `production` → build → push a ECR → deploy en App Runner. No requiere build local.

- **Diagrama de arquitectura:** [`docs/architecture.md`](docs/architecture.md)
- **Plan / arquitectura / costos:** [`docs/aws-deployment-plan.md`](docs/aws-deployment-plan.md)
- **IaC (Terraform):** [`infra/terraform/`](infra/terraform/)
- **Procedimiento paso a paso con validaciones:** [`docs/RUNBOOK.md`](docs/RUNBOOK.md)
- **CI/CD:** [`.github/workflows/deploy.yml`](.github/workflows/deploy.yml)

## Autenticación

Auth propia con **OIDC contra el Hosted UI de Cognito** (`src/lib/auth/` + `src/proxy.ts`):
login con PKCE + `state`, verificación del `id_token` contra el JWKS de Cognito, y sesión
en cookie HttpOnly firmada. El `proxy.ts` protege todas las rutas salvo `/api/health`,
`/api/auth/*` y el warm-up interno. MFA (TOTP) obligatorio; alta/baja de usuarios por admin
en Cognito. Localmente la auth queda deshabilitada si no hay variables de Cognito.

> El deploy a producción **se detiene para aprobación humana explícita** (política
> DinoCloud): el gate del environment `production` en GitHub Actions.
