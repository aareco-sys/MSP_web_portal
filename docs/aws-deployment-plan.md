# Plan de Deploy a AWS — MSP Metrics Portal

> **DinoCloud Internal - Confidential**
> App: `aareco-sys/MSP_web_portal` · Audiencia: Director de Ingeniería / SRE
> Estado: **Borrador para aprobación** · Fecha: 2026-06-10
> Regla: el deploy a infraestructura productiva **se detiene para aprobación humana explícita** antes de ejecutarse.

---

## 1. Resumen ejecutivo

Llevar a producción en AWS el **MSP Metrics Portal** — dashboard interno de métricas de ClickUp para la operación MSP — al **menor costo posible**, para **1–10 usuarios**, disponible **solo Lunes a Viernes de 9:00 a 20:00 (ART)**, con **CI/CD** y secretos gestionados.

La app es hoy **una sola aplicación Next.js 16** (build de producción `standalone`, imagen Docker única) que:
- renderiza dashboards SSR dinámicos (Overview, Listas, Ingenieros, Mensual, Rex, Reporte, scorecards);
- consume la **API de ClickUp server-side** con un token, y **cachea en memoria** el dataset principal (clientes activos) y la lista **Rex** — **2 cachés** independientes con TTL 30 min;
- el primer fetch en frío tarda ~15–20 s (recorre listas + time-in-status + imputaciones por tarea).

> **Implicancia de arquitectura:** las cachés en memoria piden una **instancia siempre tibia** (1 instancia mínima). Por eso **serverless scale-to-zero (Lambda) NO es buen fit** (cada cold start re-traería todo el dataset → 15–20 s + N llamadas a ClickUp + riesgo de rate-limit). Ver §7.

| Métrica objetivo | Valor |
|---|---|
| **Ventana de servicio** | **L–V 9:00–20:00 ART** (~238 h/mes; fuera de eso el servicio está pausado) |
| Costo run-rate (recomendado, App Runner **con schedule**) | **~USD 8–10 / mes** |
| Costo run-rate (App Runner 24×7, referencia) | ~USD 12–16 / mes |
| Usuarios | 1–10 (internos) |
| Tiempo de implementación | ~1 semana (1 SRE) |
| Disponibilidad objetivo | 99% **dentro de la ventana** (single region, internal tool) |
| Cold start (primer acceso del día) | ~1–2 min (resume del servicio) + ~15–20 s (fetch en frío) |
| RTO / RPO | <1 h (redeploy desde IaC) / 0 (app stateless, datos viven en ClickUp) |

**Se pide aprobar:** presupuesto (§5), cuenta AWS y región, subdominio `portal.dinocloud.com`, y la lista inicial de usuarios habilitados.

---

## 2. Opciones de hosting evaluadas

| Opción | Costo/mes (aprox) | Ops | Caché tibia | Veredicto |
|---|---|---|---|---|
| **AWS App Runner** (1 vCPU / 2 GB) | **~USD 12–16** | Mínima (managed, HTTPS incluido) | ✅ 1 instancia mín. | ✅ **Recomendado** |
| EC2 `t4g.small` + CloudFront (24×7) | ~USD 17–19 | Media (parches, deploy por SSM) | ✅ | Alternativa |
| EC2 `t4g.small` con schedule L-V 9–19 | ~USD 9–12 | Media + cold start diario | ⚠️ se enfría al apagar | Más barato |
| Lightsail Container (Micro 1 GB / Small 2 GB) | USD 10 / USD 20 (flat) | Baja | ✅ | Simple, precio fijo |
| Lambda + OpenNext (scale-to-zero) | ~USD 1–5 | Media-alta | ❌ pierde caché | ❌ No apto (ver §1) |
| ECS Fargate + ALB | ~USD 30–35 | Media | ✅ | ❌ ALB encarece a esta escala |

**Recomendación: AWS App Runner.** Es el mejor balance costo/ops/UX para esta app: endpoint **HTTPS gestionado** (sin ALB), **mantiene 1 instancia tibia** (la caché sobrevive), **auto-deploy desde ECR**, integra **Secrets Manager** nativamente y escala solo si hiciera falta. Casi sin operación de infraestructura.

> Si se prioriza el costo absoluto y se acepta un cold start diario, **EC2 `t4g.small` con schedule** (~USD 9–12) es válido. Si se prefiere **precio fijo y simpleza**, **Lightsail Micro** (USD 10 flat).

---

## 3. Arquitectura objetivo (recomendada: App Runner)

```
                         Internet
                            │  HTTPS (cert AWS gestionado)
                  ┌─────────▼──────────┐
                  │   AWS App Runner   │  portal.dinocloud.com
                  │  Next.js 16 (Docker)│  1 vCPU / 2 GB · min 1 / max 2 inst.
                  │  · Auth.js + Cognito │  (auth middleware protege todo)
                  │  · caché en memoria  │
                  └─────────┬──────────┘
                            │ IAM instance role
        ┌───────────────────┼───────────────────┬───────────────┐
        │                   │                   │               │
   ┌────▼─────┐      ┌──────▼──────┐     ┌──────▼─────┐   ┌──────▼──────┐
   │ Secrets  │      │   Cognito   │     │    ECR     │   │ CloudWatch  │
   │ Manager  │      │ User Pool   │     │ (imágenes) │   │ logs/metrics│
   │ (token)  │      │ email + MFA │     └────────────┘   └─────────────┘
   └──────────┘      └─────────────┘
                            │ egress
                   ┌────────▼─────────┐
                   │  api.clickup.com │  (única dependencia externa)
                   └──────────────────┘
```

| Componente | Servicio | Por qué |
|---|---|---|
| Compute | **App Runner** 1 vCPU / 2 GB, min 1 instancia | Caché tibia + HTTPS sin ALB. 2 GB cubre el pico del fetch en frío. |
| Auth | **Auth.js (NextAuth v5) + Cognito User Pool** (email + MFA TOTP) | La auth vive dentro de la app (middleware protege todas las rutas). Cognito free <50k MAU. |
| Secretos | **AWS Secrets Manager** (`CLICKUP_TOKEN`, `AUTH_SECRET`, `COGNITO_CLIENT_SECRET`) | Inyectados como env en runtime (App Runner lo soporta nativo). Nunca en imagen ni repo. Rotables. |
| Config no-secreta | env vars de App Runner | `CLICKUP_TEAM_ID`, `CLICKUP_SPACE_ID`, `CLICKUP_ACTIVE_FOLDER_IDS`, `CLICKUP_REX_LIST_ID`, `MSP_CACHE_TTL`, `MSP_LOOKBACK_DAYS`, `NODE_OPTIONS`. Todas con default en el código; el único obligatorio es el token. |
| Registry | **ECR** privado | Imagen por commit SHA; lifecycle policy (últimas 10). |
| DNS / TLS | **Route 53** + cert gestionado de App Runner | `portal.dinocloud.com`, TLS automático. |
| Observabilidad | **CloudWatch** logs + métricas + alarma 5xx/health | `/api/health` (sin auth ni ClickUp) para el healthcheck. |
| Auditoría | **CloudTrail** | Trazabilidad de IAM/Secrets/deploys (política org). |
| Schedule on/off | **EventBridge Scheduler** (2 reglas, timezone ART) + **Lambda** | Pausa/reanuda App Runner para servir solo L–V 9–20. Free tier. Ver §3.1. |
| IaC | **Terraform** | App Runner, ECR, Cognito, Secrets, IAM/OIDC, Route 53, Scheduler+Lambda. State en S3 + lock DynamoDB. |

**Endurecimiento opcional (fase 2):** VPC connector + NAT para **egress allowlist** (solo `api.clickup.com`), y CloudFront + WAF adelante si se quiere edge/caché/rate-limit. A 1–10 usuarios no es imprescindible al inicio.

### 3.1 Ventana de servicio — L–V 9:00–20:00 (ART)

La app solo debe estar disponible **Lunes a Viernes de 9 a 20 (hora Argentina, UTC-3)**. Se logra **pausando/reanudando el servicio App Runner** por horario (cuando está pausado **no se factura compute** y el endpoint no sirve):

- **EventBridge Scheduler** con timezone `America/Argentina/Buenos_Aires` (sin DST, estable):
  - **Resume** a las **08:50** L–V → `apprunner:ResumeService` (margen para que esté listo a las 9:00, incluye ~1–2 min de arranque).
  - **Pause** a las **20:00** L–V → `apprunner:PauseService`.
- Una **Lambda** mínima (o el target nativo de Scheduler a la API de App Runner) ejecuta pause/resume con un IAM role acotado a ese servicio.
- **Warm-up opcional** post-resume: un `curl` interno a `/api/metrics` **y `/api/rex`** a las 08:55 para precalentar ambas cachés (el fetch en frío tarda ~15–20 s); así el primer usuario ya las encuentra tibias.
- **Fuera de la ventana:** el endpoint responde *no disponible* (servicio pausado) — comportamiento buscado (restringe acceso + ahorra costo). Acceso puntual fuera de horario: `apprunner:ResumeService` manual (<2 min) o desactivar la regla.

> Alternativa equivalente con **EC2**: reglas de EventBridge + `ec2:StartInstances`/`StopInstances` (mismo patrón). Con EC2 la caché se enfría al apagar; con App Runner pausado, al reanudar también arranca en frío → en ambos casos el primer acceso del día hace el fetch completo (mitigado por el warm-up).

---

## 4. CI/CD

```
GitHub (push a main)
   │
   ▼  GitHub Actions (OIDC → AWS, sin access keys)
   1. Lint (eslint) + typecheck (tsc) + tests (vitest)
   2. docker build  (NEXT_OUTPUT=standalone) → imagen
   3. push a ECR  (tag = <git-sha> + :latest)
   4. App Runner auto-deploy del nuevo :latest  (o aws apprunner start-deployment)
   5. healthcheck post-deploy: GET /api/health
   6. notifica a Slack #msp-deploys
```

- **Ambientes:** arrancar solo **prod** (push a `main` + branch protection). Sumar `staging` cuando haya >1 contribuidor.
- **Rollback:** redeploy del SHA anterior (<2 min). Sin migraciones (no hay DB propia).
- **Gate de aprobación:** el job de deploy a prod requiere **aprobación manual** (GitHub Environments protection rule) además de la aprobación inicial de este plan.

---

## 5. Costos estimados (us-east-1)

> Estimaciones aproximadas a 2026-06; verificar con AWS Pricing Calculator antes de aprobar. No incluye impuestos.

### 5.1 Recomendado — App Runner (1 vCPU / 2 GB) **con schedule L–V 9–20 (~238 h/mes)**

| Recurso | Cálculo | Mensual |
|---|---|---|
| App Runner — memoria provisionada | 2 GB × $0.007/GB-h × **238 h** | **$3.33** |
| App Runner — vCPU activo (tráfico bajo) | ~15–30 h activas × $0.064 | $1.00–2.00 |
| EventBridge Scheduler + Lambda (pause/resume) | free tier | $0.00 |
| ECR storage | ~1 GB × $0.10 | $0.10 |
| Secrets Manager | 3 secretos × $0.40 | $1.20 |
| Cognito (≤10 MAU) | free tier | $0.00 |
| CloudWatch logs (~1 GB) | ingest + retención 30d | ~$0.70 |
| Route 53 hosted zone | $0.50 + queries | $0.60 |
| Data transfer out (estim.) | ~2 GB | $0.18 |
| **Total** | | **~USD 8–10 / mes** |

> **24×7 (referencia):** sin schedule, la memoria pasa a 730 h ($10.22) → total **~USD 15/mes**.
> **Ahorro extra:** **0.5 vCPU / 1 GB** con schedule → compute ~$2 → total **~USD 6–7/mes** (riesgo: 1 GB justo en el fetch en frío; mitigar con `--max-old-space-size`).

### 5.2 Alternativa — EC2 `t4g.small` con schedule (L–V 9–20 ART, ≈238 h)

| Recurso | Mensual |
|---|---|
| EC2 t4g.small (≈238 h activas) | $4.00 |
| EBS gp3 10 GB | $0.80 |
| IPv4 pública | $3.65 |
| Secrets Manager (3) | $1.20 |
| CloudWatch + Route 53 + transfer | ~$2.00 |
| **Total** | **~USD 11 / mes** (24×7 ≈ USD 19) |

> Trade-off: cold start diario (la caché se enfría al apagar) + más operación (parches OS, deploy por SSM, Lambda de start/stop).

### 5.3 Alternativa precio fijo — Lightsail Container

| Plan | vCPU / RAM | Mensual (flat, incluye HTTPS) |
|---|---|---|
| Micro | 0.25 / 1 GB | **USD 10** |
| Small | 0.5 / 2 GB | USD 20 |

> + Route 53 (~$0.60). Secretos vía variables del deployment o SDK (no integra Secrets Manager nativo).

### 5.4 Costos one-off
- Subdominio: $0 si se delega `portal.dinocloud.com`; ~USD 12/año si se compra dominio nuevo.
- Setup: ~1 semana de 1 SRE (labor interno).

---

## 6. Seguridad y compliance (política DinoCloud)

- ✅ **Sin credenciales hardcodeadas:** `CLICKUP_TOKEN` y secretos de auth en **Secrets Manager**, inyectados en runtime. El `.env` está gitignored; el repo no contiene secretos (verificado).
- ✅ **Acceso autenticado:** Cognito con **MFA obligatorio**, self sign-up off, alta/baja por admin.
- ✅ **Datos de ClickUp = confidencial interno:** cifrado en tránsito (TLS) y en reposo; no salen de AWS salvo a la API de ClickUp.
- ✅ **Egress acotado** (fase 2 opcional): allowlist a `api.clickup.com`.
- ✅ **Trazabilidad:** CloudTrail (IAM/Secrets/deploys) + logs de Cognito.
- ✅ **Marcado “DinoCloud Internal - Confidential”** ya presente en la app, reportes y este doc.
- ⛔ **Deploy a prod:** se **detiene para aprobación humana explícita**; una vez aprobado se procede manteniendo trazabilidad para auditoría/recovery.
- ℹ️ **PII de clientes:** el sistema maneja nombres de cuentas y asignaciones internas; **no** debería ingresar PII de clientes finales. Confirmar con el Director.

---

## 7. Notas técnicas que condicionan el deploy

- **Memoria:** el `next dev` sufre OOM en sesiones largas (Turbopack/HMR); **en prod se corre el build (`next start`/standalone)**, mucho más estable. Igual conviene fijar `NODE_OPTIONS=--max-old-space-size` acorde a la RAM de la instancia (p.ej. 1536 en 2 GB) y dejar que el orquestador reinicie ante OOM.
- **Cachés en memoria (TTL 30 min):** son **dos** — dataset principal (`/api/metrics`, `/api/users/*`) y lista **Rex** (`/api/rex`). Requieren **min 1 instancia** persistente. Si se escala a >1 instancia, cada una tiene sus cachés (aceptable; `/api/refresh` limpia ambas en la instancia local). Por eso se evita scale-to-zero.
- **Cold fetch:** primer request tras arranque/TTL tarda ~15–20 s. Opcional: warm-up post-deploy con un `curl` interno a `/api/metrics` y `/api/rex`.
- **`output: standalone`** se activa solo en el build de imagen (`NEXT_OUTPUT=standalone`, ver `Dockerfile`); local usa `next start` normal.
- **Fuentes self-hosted** (`next/font/local`, Montserrat/Roboto/Space Grotesk en `src/fonts/`): el build **no depende de Google Fonts** → imagen reproducible y CI sin acceso a red externa.
- **Healthcheck:** `GET /api/health` (no requiere auth ni ClickUp).

---

## 8. Plan de implementación (~1 semana)

**Fase 0 — Prerrequisitos (aprobación)**
- [ ] Aprobar este plan, presupuesto, cuenta/región y subdominio.
- [ ] Lista inicial de usuarios (emails) para Cognito.
- [ ] Bootstrap del state de Terraform (S3 + DynamoDB lock).

**Fase 1 — Infra base (IaC)**
- [ ] Terraform: ECR, Secrets Manager (con `CLICKUP_TOKEN`), Cognito User Pool (MFA), App Runner service, IAM roles, OIDC GitHub↔AWS, Route 53 + dominio.
- [ ] **Schedule L–V 9–20 ART**: EventBridge Scheduler (resume 08:50 / pause 20:00, tz `America/Argentina/Buenos_Aires`) + Lambda con role acotado a `apprunner:Pause/ResumeService`; warm-up `/api/metrics` + `/api/rex` 08:55.
- [ ] Config no-secreta de App Runner (env): `CLICKUP_TEAM_ID/SPACE_ID/ACTIVE_FOLDER_IDS/REX_LIST_ID`, `MSP_CACHE_TTL`, `MSP_LOOKBACK_DAYS`, `NODE_OPTIONS` (todas con default; el token va por Secrets Manager).

**Fase 2 — Auth en la app (código)**
- [ ] Integrar **Auth.js (NextAuth v5) + Cognito** + middleware que protege todas las rutas. (`AUTH_SECRET`, `COGNITO_*` desde Secrets Manager.)

**Fase 3 — CI/CD**
- [ ] GitHub Actions: lint+typecheck+test → build → push ECR → deploy App Runner → healthcheck → Slack. Gate de aprobación manual en prod.

**Fase 4 — Observabilidad + handoff**
- [ ] CloudWatch dashboard + alarmas (5xx, health, memoria) + SNS email.
- [ ] `RUNBOOK.md`: deploy, rotar el `CLICKUP_TOKEN`, alta/baja de usuarios Cognito, recovery.
- [ ] Demo + handoff.

---

## 9. Aprobaciones requeridas

| Decisión | Aprobador | Estado |
|---|---|---|
| Presupuesto ~USD 8–10/mes (con schedule) | Director de Ingeniería | Pendiente |
| Ventana de servicio L–V 9:00–20:00 ART | Solicitante | ✅ Confirmado |
| Cuenta AWS + región (us-east-1) | Director de Ingeniería | Pendiente |
| Subdominio `portal.dinocloud.com` | Owner del dominio | Pendiente |
| Lista inicial de usuarios (emails) | Director de Ingeniería | Pendiente |
| Hosting: **App Runner** (1 vCPU / 2 GB, con schedule) | Solicitante | ✅ Confirmado |

---

> **DinoCloud Internal - Confidential** · No distribuir fuera de la organización.
